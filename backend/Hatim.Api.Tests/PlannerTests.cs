using System.ComponentModel.DataAnnotations;
using Hatim.Api;
using Xunit;

namespace Hatim.Api.Tests;

public sealed class PlannerTests
{
    private static readonly Catalog Catalog = new();
    private sealed record ParityCase(Member[] Members, Settings Settings, Plan Plan);
    private static readonly ParityCase[] Cases = ApiJson.Read<ParityCase[]>(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "planner-parity.json")));
    public static IEnumerable<object[]> CaseNumbers => Enumerable.Range(0, Cases.Length).Select(i => new object[] { i });

    [Theory, MemberData(nameof(CaseNumbers))]
    public void MatchesOriginalPythonDecisions(int index)
    {
        var c = Cases[index];
        Assert.Equal(ApiJson.Text(c.Plan), ApiJson.Text(Planner.Build(Catalog.Experiences, c.Members, c.Settings)));
    }

    private static Member Person(Preferences? preferences = null) => new("a", preferences ?? new() { Name = "أمل" });

    [Fact]
    public void ShrinkingOnlyTruncatesAndAccountsForEveryExperience()
    {
        var people = new[] { Person(new() { Name = "أمل", Cuisines = [Cuisine.Japanese, Cuisine.Saudi] }) };
        var full = Planner.Build(Catalog.Experiences, people, new());
        for (var slots = 1; slots <= 9; slots++)
        {
            var plan = Planner.Build(Catalog.Experiences, people, new() { Slots = slots });
            Assert.Equal(ApiJson.Text(full.Selected.Take(slots)), ApiJson.Text(plan.Selected));
            Assert.Equal("fire", plan.Selected[0].ExperienceId);
            var ids = plan.Selected.Select(d => d.ExperienceId).Concat(plan.Pocket.Select(p => p.ExperienceId)).ToArray();
            Assert.Equal(Catalog.Ids.Count, ids.Distinct().Count());
            Assert.Equal(ids.Length, ids.Distinct().Count());
        }
    }

    [Fact]
    public void AllergyRequiresVerificationAndContradictoryDeclarationAlwaysBlocks()
    {
        var people = new[] { Person(new() { Name = "أمل", Allergies = [Allergen.Nuts] }) };
        var meal = Catalog.Experiences[0] with { VerifiedFreeOf = [Allergen.Nuts] };
        Assert.Empty(Planner.Evaluate(meal, people).Blocked);
        Assert.NotEmpty(Planner.Evaluate(meal with { Allergens = [Allergen.Nuts] }, people).Blocked);
        var plan = Planner.Build(Catalog.Experiences, people, new() { Slots = 1 });
        Assert.Empty(plan.Selected);
        Assert.NotNull(plan.AnchorIssue);
        Assert.All(plan.Pocket, item => Assert.True(item.Blocked));
    }

    [Fact]
    public void SoftHeatPreferenceWithoutWorkaroundReducesAffinityButDoesNotBlock()
    {
        var meal = Catalog.Experiences.Single(e => e.Id == "bao") with { MildOption = null };
        var normal = Planner.Evaluate(meal, [Person()]);
        var mild = Planner.Evaluate(meal, [Person(new() { Name = "أمل", Mild = true })]);
        Assert.Empty(mild.Blocked);
        Assert.Equal(normal.Score - 20, mild.Score);
        Assert.Contains("تفضيل مرن", mild.Adaptations[0]);
    }

    [Fact]
    public void RankingDoesNotDependOnMemberOrder()
    {
        Member[] people = [Person(new() { Name = "أمل", Role = Role.Visitor, Cuisines = [Cuisine.Saudi] }),
            new("b", new() { Name = "بدر", Cuisines = [Cuisine.Japanese] })];
        var a = Planner.Build(Catalog.Experiences, people, new());
        var b = Planner.Build(Catalog.Experiences, people.Reverse().ToArray(), new());
        Assert.Equal(a.Selected.Select(d => d.ExperienceId), b.Selected.Select(d => d.ExperienceId));
    }

    [Fact]
    public void ConsumedAndPocketConstraintsAreValidated()
    {
        Settings[] invalid = [new() { Slots = 1, CompletedIds = ["fire", "sushi"] },
            new() { PocketIds = ["fire"] }, new() { CompletedIds = ["sushi", "sushi"] },
            new() { PocketIds = ["sushi"], CompletedIds = ["sushi"] }];
        foreach (var settings in invalid)
            Assert.False(Validator.TryValidateObject(settings, new(settings), [], true));
    }
}
