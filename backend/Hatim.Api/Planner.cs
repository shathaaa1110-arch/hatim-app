namespace Hatim.Api;

// Pure ranking: time truncates the same order instead of reshuffling it.
public static class Planner
{
    public sealed record Evaluation(string[] Blocked, string[] Adaptations, double Score);

    public static Evaluation Evaluate(Experience experience, IReadOnlyList<Member> members)
    {
        List<string> blocked = [], adaptations = [];
        List<double> affinities = [];
        foreach (var member in members)
        {
            var p = member.Preferences;
            foreach (var allergy in p.Allergies.Distinct())
            {
                var name = ApiJson.Read<string>(ApiJson.Text(allergy));
                if (experience.Allergens.Contains(allergy))
                    blocked.Add($"تعارض مع حساسية {name} لدى {p.Name}؛ لا نقترح إزالة المكوّن كحل.");
                else if (!experience.VerifiedFreeOf.Contains(allergy))
                    blocked.Add($"سلامة {p.Name} من {name} غير موثّقة، بما فيها التلامس العرضي.");
            }
            if (p.Vegetarian && !experience.Vegetarian)
            {
                if (!string.IsNullOrEmpty(experience.VegetarianOption))
                    adaptations.Add($"لـ{p.Name}: {experience.VegetarianOption}");
                else blocked.Add($"لا يتوفر خيار نباتي يناسب {p.Name}.");
            }
            if (experience.Price > p.Budget)
                blocked.Add($"تتجاوز ميزانية {p.Name} ({p.Budget} ر.س للشخص).");
            var affinity = p.Cuisines.Contains(experience.Cuisine) ? 20.0 : 0.0;
            if (p.Mild && experience.Spicy)
            {
                if (!string.IsNullOrEmpty(experience.MildOption))
                    adaptations.Add($"لـ{p.Name}: {experience.MildOption}");
                else
                {
                    affinity -= 20;
                    adaptations.Add($"تنبيه لـ{p.Name}: الطبق حار ولا يتوفر تعديل؛ هذا تفضيل مرن.");
                }
            }
            if (p.Role == Role.Visitor && experience.Cuisine == Cuisine.Saudi) affinity += 5;
            if (p.Role == Role.Resident && experience.Category == Category.HiddenGems) affinity += 5;
            affinities.Add(affinity);
        }
        var score = (double)experience.Editorial;
        if (affinities.Count > 0)
            score += 0.7 * affinities.Sum() / affinities.Count + 0.3 * affinities.Min();
        return new(blocked.ToArray(), adaptations.ToArray(), Math.Round(score, 2, MidpointRounding.ToEven));
    }

    public static Plan Build(IReadOnlyList<Experience> catalog, IReadOnlyList<Member> members, Settings settings)
    {
        List<Decision> candidates = [];
        List<PocketItem> pocket = [];
        string? anchorIssue = null;
        foreach (var experience in catalog)
        {
            if (settings.CompletedIds.Contains(experience.Id)) continue;
            if (settings.PocketIds.Contains(experience.Id))
            {
                pocket.Add(new(experience.Id, "حفظتوها لوقت ثاني، بلا ضغط."));
                continue;
            }
            var evaluation = Evaluate(experience, members);
            if (evaluation.Blocked.Length > 0)
            {
                var reason = string.Join(" ", evaluation.Blocked);
                if (experience.Id == settings.AnchorId)
                    anchorIssue = $"ركيزتكم «{experience.Title}» لا تناسب المجموعة الآن. " + reason;
                pocket.Add(new(experience.Id, reason, true));
                continue;
            }
            var anchor = experience.Id == settings.AnchorId;
            var matched = members.Where(m => m.Preferences.Cuisines.Contains(experience.Cuisine))
                .Select(m => m.Preferences.Name).ToArray();
            var explanation = anchor
                ? "اختياركم الذي نبني حوله الخطة؛ يبقى حتى لو صار الوقت عشاء واحدًا."
                : experience.Why;
            if (!anchor && matched.Length > 0)
                explanation += $" ويتوافق مع ذوق {string.Join(" و", matched)}.";
            candidates.Add(new(experience.Id, anchor ? Priority.Anchor : Priority.Core,
                explanation, evaluation.Adaptations, evaluation.Score));
        }
        var ranked = candidates.OrderBy(d => d.ExperienceId != settings.AnchorId)
            .ThenByDescending(d => d.Score).ThenBy(d => d.ExperienceId, StringComparer.Ordinal)
            .Select((d, index) => d.Priority == Priority.Anchor ? d
                : d with { Priority = index < 3 ? Priority.Core : Priority.Flexible }).ToArray();
        var remaining = settings.Slots - settings.CompletedIds.Length;
        // Reserve the blocked dream's slot instead of silently replacing it.
        var capacity = Math.Max(0, remaining - (anchorIssue is not null && remaining > 0 ? 1 : 0));
        var selected = ranked.Take(capacity).ToArray();
        pocket.AddRange(ranked.Skip(capacity).Select(d => new PocketItem(d.ExperienceId,
            "ضاق الوقت، مو الطموح. ترجع تلقائيًا إذا زادت الخانات.")));
        return new(selected, pocket.ToArray(), anchorIssue, settings.CompletedIds.Length,
            remaining, remaining - selected.Length);
    }
}

public sealed class Catalog
{
    public IReadOnlyList<Experience> Experiences { get; }
    public IReadOnlySet<string> Ids { get; }
    public Catalog()
    {
        Experiences = ApiJson.Read<Experience[]>(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "catalog.json")));
        Ids = Experiences.Select(e => e.Id).ToHashSet(StringComparer.Ordinal);
    }
}
