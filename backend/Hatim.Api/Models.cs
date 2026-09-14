using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Hatim.Api;

public enum Role
{
    [JsonStringEnumMemberName("مقيم")] Resident,
    [JsonStringEnumMemberName("زائر")] Visitor
}
public enum Cuisine
{
    [JsonStringEnumMemberName("سعودي")] Saudi,
    [JsonStringEnumMemberName("ياباني")] Japanese,
    [JsonStringEnumMemberName("إيطالي")] Italian,
    [JsonStringEnumMemberName("شامي")] Levantine,
    [JsonStringEnumMemberName("آسيوي")] Asian,
    [JsonStringEnumMemberName("قهوة وحلى")] CoffeeAndDessert
}
public enum Allergen
{
    [JsonStringEnumMemberName("مكسرات")] Nuts,
    [JsonStringEnumMemberName("فول سوداني")] Peanuts,
    [JsonStringEnumMemberName("حليب")] Milk,
    [JsonStringEnumMemberName("قمح")] Wheat,
    [JsonStringEnumMemberName("سمسم")] Sesame,
    [JsonStringEnumMemberName("قشريات")] Shellfish,
    [JsonStringEnumMemberName("سمك")] Fish,
    [JsonStringEnumMemberName("بيض")] Eggs,
    [JsonStringEnumMemberName("صويا")] Soy
}
public enum Category
{
    [JsonStringEnumMemberName("مطابخ جديدة")] NewCuisines,
    [JsonStringEnumMemberName("كنوز مخفية")] HiddenGems,
    [JsonStringEnumMemberName("افتتاحات")] Openings,
    [JsonStringEnumMemberName("طبق ولحظة")] DishAndMoment
}
public enum Priority
{
    [JsonStringEnumMemberName("ركيزة")] Anchor,
    [JsonStringEnumMemberName("أساسية")] Core,
    [JsonStringEnumMemberName("مرنة")] Flexible
}

public sealed record Preferences
{
    private string name = null!;
    [Required, StringLength(30, MinimumLength = 1)]
    public required string Name { get => name; init => name = value?.Trim()!; }
    [DefaultValue(Role.Resident)] public Role Role { get; init; } = Role.Resident;
    [MaxLength(6)] public Cuisine[] Cuisines { get; init; } = [];
    [MaxLength(9)] public Allergen[] Allergies { get; init; } = [];
    public bool Vegetarian { get; init; }
    public bool Mild { get; init; }
    [Range(30, 500), DefaultValue(200)] public int Budget { get; init; } = 200;
}

public sealed record Member(string Id, Preferences Preferences, bool Organizer = false);

public sealed record Experience
{
    public required string Id { get; init; }
    public required string Title { get; init; }
    public required string Venue { get; init; }
    public required string Neighborhood { get; init; }
    public required Category Category { get; init; }
    public required Cuisine Cuisine { get; init; }
    public required string Description { get; init; }
    public required string Why { get; init; }
    public required string Image { get; init; }
    public required int Price { get; init; }
    public required int Minutes { get; init; }
    public required int Editorial { get; init; }
    public bool Vegetarian { get; init; }
    public string? VegetarianOption { get; init; }
    public bool Spicy { get; init; }
    public string? MildOption { get; init; }
    public Allergen[] Allergens { get; init; } = [];
    // Absence AND cross-contact handling must both be verified.
    public Allergen[] VerifiedFreeOf { get; init; } = [];
}

public sealed record Settings : IValidatableObject
{
    private string? anchorId = "fire";
    private string[] pocketIds = [];
    private string[] completedIds = [];
    [Range(1, 9), DefaultValue(9)] public int Slots { get; init; } = 9;
    [DefaultValue("fire")] public string? AnchorId { get => anchorId; init => anchorId = value?.Trim(); }
    [MaxLength(30)] public string[] PocketIds { get => pocketIds; init => pocketIds = value?.Select(id => id?.Trim()!).ToArray()!; }
    [MaxLength(9)] public string[] CompletedIds { get => completedIds; init => completedIds = value?.Select(id => id?.Trim()!).ToArray()!; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (CompletedIds.Distinct().Count() != CompletedIds.Length)
            yield return new("Repeated completed experience");
        if (PocketIds.Distinct().Count() != PocketIds.Length)
            yield return new("Repeated pocket experience");
        if (Slots < CompletedIds.Length)
            yield return new("Consumed meal slots cannot disappear");
        if (AnchorId is not null && PocketIds.Contains(AnchorId))
            yield return new("The anchor cannot be moved to the pocket");
        if (PocketIds.Intersect(CompletedIds).Any())
            yield return new("A completed experience cannot be in the pocket");
        if (PocketIds.Any(string.IsNullOrWhiteSpace) || CompletedIds.Any(string.IsNullOrWhiteSpace))
            yield return new("Experience IDs must not be empty");
    }
}

public sealed record Decision(string ExperienceId, Priority Priority, string Reason, string[] Adaptations, double Score);
public sealed record PocketItem(string ExperienceId, string Reason, bool Blocked = false);
public sealed record Plan(Decision[] Selected, PocketItem[] Pocket, string? AnchorIssue, int Consumed, int Available, int Unfilled);
public sealed record CreateGroup
{
    private string title = "لَمّتنا في الرياض";
    [StringLength(60, MinimumLength = 1), DefaultValue("لَمّتنا في الرياض")] public string Title { get => title; init => title = value?.Trim()!; }
    [Required] public required Preferences Preferences { get; init; }
}
public sealed record GroupView(string Id, string Title, string InviteCode, Settings Settings, Member[] Members, Plan Plan);
public sealed record GroupCreated(string OrganizerToken, GroupView Group);
public sealed record MemberCreated(string MemberToken, Member Member);
public sealed record InviteView(string Title, string[] MemberNames, int Slots, Decision[] Selected, string? AnchorIssue, int Consumed);
public sealed record ApiError(string Detail);

public static class ApiJson
{
    public static readonly JsonSerializerOptions Options = Create();
    private static JsonSerializerOptions Create()
    {
        var options = new JsonSerializerOptions();
        Configure(options);
        return options;
    }
    public static void Configure(JsonSerializerOptions options)
    {
        options.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        options.PropertyNameCaseInsensitive = false;
        options.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow;
        options.NumberHandling = JsonNumberHandling.Strict;
        options.RespectNullableAnnotations = true;
        options.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false));
    }
    public static string Text<T>(T value) => JsonSerializer.Serialize(value, Options);
    public static T Read<T>(string value) => JsonSerializer.Deserialize<T>(value, Options)
        ?? throw new JsonException("Missing value");
}
