using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Hatim.Api;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace Hatim.Api.Tests;

public sealed class TestApp(bool legacy = false) : WebApplicationFactory<Program>
{
    public string DirectoryPath { get; } = Path.Combine(Path.GetTempPath(), "hatim-tests-" + Guid.NewGuid());
    public string DatabasePath => Path.Combine(DirectoryPath, "test.sqlite3");
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        Directory.CreateDirectory(DirectoryPath);
        if (legacy && !File.Exists(DatabasePath))
        {
            using var connection = new SqliteConnection($"Data Source={DatabasePath}");
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "legacy.sql"));
            command.ExecuteNonQuery();
        }
        File.WriteAllText(Path.Combine(DirectoryPath, "index.html"), "<!doctype html><title>Hatim test companion</title>");
        builder.UseSetting("HATIM_WEB_ROOT", DirectoryPath);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<Store>();
            services.AddSingleton(new Store(DatabasePath));
        });
    }
    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            SqliteConnection.ClearAllPools();
            if (Directory.Exists(DirectoryPath)) Directory.Delete(DirectoryPath, true);
        }
    }
}

public sealed class ApiTests : IDisposable
{
    private readonly TestApp app = new();
    private readonly HttpClient client;
    public ApiTests() => client = app.CreateClient(new() { AllowAutoRedirect = false });
    public void Dispose() { client.Dispose(); app.Dispose(); }

    private Task<HttpResponseMessage> Send(HttpMethod method, string path, object? body = null, string? token = null)
    {
        var request = new HttpRequestMessage(method, path);
        if (token is not null) request.Headers.Authorization = new("Bearer", token);
        if (body is not null) request.Content = new StringContent(ApiJson.Text(body), Encoding.UTF8, "application/json");
        return client.SendAsync(request);
    }
    private static async Task<T> Read<T>(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        return ApiJson.Read<T>(await response.Content.ReadAsStringAsync());
    }
    private async Task<GroupCreated> Create() => await Read<GroupCreated>(await Send(HttpMethod.Post, "/api/groups", new { preferences = new { name = "المنظّم" } }));
    private async Task<MemberCreated> Join(string code, object? preferences = null) => await Read<MemberCreated>(
        await Send(HttpMethod.Post, $"/api/invites/{code}/members", preferences ?? new { name = "سارة", vegetarian = true }));

    [Fact]
    public async Task MembersJoinAndEditTheirOwnProfileWithoutOwnerPrivilegesOrPrivacyLeaks()
    {
        var created = await Create();
        var code = created.Group.InviteCode;
        var joined = await Join(code);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(HttpMethod.Get, $"/api/groups/{created.Group.Id}", token: joined.MemberToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(HttpMethod.Put, $"/api/groups/{created.Group.Id}/settings", new { slots = 1 }, joined.MemberToken)).StatusCode);
        Assert.Equal("سارة", (await Read<Member>(await Send(HttpMethod.Get, $"/api/invites/{code}/me", token: joined.MemberToken))).Preferences.Name);
        await Read<Member>(await Send(HttpMethod.Put, $"/api/invites/{code}/me", new { name = "سارة", allergies = new[] { "مكسرات" } }, joined.MemberToken));
        var group = await Read<GroupView>(await Send(HttpMethod.Get, $"/api/groups/{created.Group.Id}", token: created.OrganizerToken));
        Assert.Equal(2, group.Members.Length);
        Assert.NotNull(group.Plan.AnchorIssue);
        var invitation = await Read<InviteView>(await Send(HttpMethod.Get, $"/api/invites/{code}"));
        Assert.NotNull(invitation.AnchorIssue);
        Assert.DoesNotContain("مكسرات", invitation.AnchorIssue);
        Assert.All(invitation.Selected, d => Assert.Empty(d.Adaptations));
        var publicJson = JsonNode.Parse(await (await client.GetAsync($"/api/invites/{code}")).Content.ReadAsStringAsync())!.AsObject();
        Assert.False(publicJson.ContainsKey("members"));
        Assert.False(publicJson.ContainsKey("preferences"));
    }

    [Fact]
    public async Task GroupsAndMemberCapabilitiesAreIsolated()
    {
        var first = await Create();
        var second = await Create();
        var joined = await Join(first.Group.InviteCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(HttpMethod.Get, $"/api/groups/{first.Group.Id}", token: second.OrganizerToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(HttpMethod.Get, $"/api/invites/{second.Group.InviteCode}/me", token: joined.MemberToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/invites/{first.Group.InviteCode}/me")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(HttpMethod.Put, $"/api/invites/{first.Group.InviteCode}/me", new { name = "غير مسموح" }, first.OrganizerToken)).StatusCode);
        var response = await Send(HttpMethod.Get, $"/api/groups/{first.Group.Id}", token: first.OrganizerToken);
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
    }

    [Theory]
    [InlineData("{\"slots\":0}")]
    [InlineData("{\"slots\":10}")]
    [InlineData("{\"slots\":1.5}")]
    [InlineData("{\"anchor_id\":\"missing\"}")]
    [InlineData("{\"pocket_ids\":[\"fire\"]}")]
    [InlineData("{\"pocket_ids\":[null]}")]
    [InlineData("{\"pocket_ids\":null}")]
    [InlineData("{\"completed_ids\":[\"fire\",\"sushi\"],\"slots\":1}")]
    [InlineData("{\"completed_ids\":[\"sushi\",\"sushi\"]}")]
    [InlineData("{\"pocket_ids\":[\"sushi\"],\"completed_ids\":[\"sushi\"]}")]
    [InlineData("{\"slots\":1,\"admin\":true}")]
    public async Task InvalidSettingsCannotChangeThePlan(string json)
    {
        var created = await Create();
        var request = new HttpRequestMessage(HttpMethod.Put, $"/api/groups/{created.Group.Id}/settings")
        { Content = new StringContent(json, Encoding.UTF8, "application/json") };
        request.Headers.Authorization = new("Bearer", created.OrganizerToken);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await client.SendAsync(request)).StatusCode);
        var group = await Read<GroupView>(await Send(HttpMethod.Get, $"/api/groups/{created.Group.Id}", token: created.OrganizerToken));
        Assert.Equal(9, group.Settings.Slots);
    }

    [Theory]
    [InlineData("{\"name\":\"   \"}")]
    [InlineData("{\"name\":null}")]
    [InlineData("{\"name\":7}")]
    [InlineData("{}")]
    [InlineData("{\"name\":\"أمل\",\"allergies\":[\"unknown\"]}")]
    [InlineData("{\"name\":\"أمل\",\"allergies\":[0]}")]
    [InlineData("{\"name\":\"أمل\",\"role\":3}")]
    [InlineData("{\"name\":\"أمل\",\"cuisines\":null}")]
    [InlineData("{\"name\":\"أمل\",\"budget\":29}")]
    [InlineData("{\"name\":\"أمل\",\"organizer\":true}")]
    public async Task InvalidPreferencesAreRejected(string preferences)
    {
        using var content = new StringContent("{\"preferences\":" + preferences + "}", Encoding.UTF8, "application/json");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await client.PostAsync("/api/groups", content)).StatusCode);
    }

    [Fact]
    public async Task OrganizerCanUpdateProfileAndRemoveMembersButNotThemself()
    {
        var created = await Create();
        var code = created.Group.InviteCode;
        var joined = await Join(code);
        var updated = await Read<GroupView>(await Send(HttpMethod.Put, $"/api/groups/{created.Group.Id}/profile", new { name = "  أمل  ", budget = 90 }, created.OrganizerToken));
        Assert.Equal("أمل", updated.Members.Single(m => m.Organizer).Preferences.Name);
        var removed = await Read<GroupView>(await Send(HttpMethod.Delete, $"/api/groups/{created.Group.Id}/members/{joined.Member.Id}", token: created.OrganizerToken));
        Assert.Single(removed.Members);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(HttpMethod.Get, $"/api/invites/{code}/me", token: joined.MemberToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(HttpMethod.Delete, $"/api/groups/{created.Group.Id}/members/{removed.Members[0].Id}", token: created.OrganizerToken)).StatusCode);
    }

    [Fact]
    public async Task ConcurrentJoinsCannotExceedTwelveMembers()
    {
        var created = await Create();
        var joins = await Task.WhenAll(Enumerable.Range(0, 16).Select(i => Send(HttpMethod.Post,
            $"/api/invites/{created.Group.InviteCode}/members", new { name = $"عضو {i}" })));
        Assert.Equal(11, joins.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(5, joins.Count(r => r.StatusCode == HttpStatusCode.Conflict));
    }

    [Fact]
    public async Task SettingsPersistAcrossStoreInstancesAndDriveSharedPlan()
    {
        var created = await Create();
        await Read<GroupView>(await Send(HttpMethod.Put, $"/api/groups/{created.Group.Id}/settings", new { slots = 1 }, created.OrganizerToken));
        var invitation = await Read<InviteView>(await client.GetAsync($"/api/invites/{created.Group.InviteCode}"));
        Assert.Equal("fire", Assert.Single(invitation.Selected).ExperienceId);
        Assert.Equal(1, invitation.Slots);
        var reopened = new Store(app.DatabasePath);
        reopened.Initialize();
        Assert.Equal(1, reopened.Run(db => db.RequireOwner(created.Group.Id, "Bearer " + created.OrganizerToken).Settings.Slots));
    }

    [Fact]
    public async Task StaticCompanionAndUnknownApiRoutesStaySeparate()
    {
        Assert.Equal("text/html", (await client.GetAsync("/join/example")).Content.Headers.ContentType?.MediaType);
        Assert.Equal("text/html", (await client.GetAsync("/")).Content.Headers.ContentType?.MediaType);
        var missing = await client.GetAsync("/api/missing");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        Assert.Equal("application/json", missing.Content.Headers.ContentType?.MediaType);
        Assert.Equal("nosniff", missing.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("no-referrer", missing.Headers.GetValues("Referrer-Policy").Single());
    }

    [Fact]
    public async Task PayloadLimitAppliesToKnownAndUnknownLengths()
    {
        var payload = Encoding.UTF8.GetBytes("{\"preferences\":{\"name\":\"" + new string('a', 17000) + "\"}}");
        using var known = new ByteArrayContent(payload);
        known.Headers.ContentType = new("application/json");
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await client.PostAsync("/api/groups", known)).StatusCode);
        using var unknown = new ChunkedContent(payload);
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await client.PostAsync("/api/groups", unknown)).StatusCode);
    }
    private sealed class ChunkedContent(byte[] bytes) : HttpContent
    {
        protected override bool TryComputeLength(out long length) { length = 0; return false; }
        protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context) => stream.WriteAsync(bytes).AsTask();
    }

    [Fact]
    public async Task OpenApiDocumentsTheExistingSnakeCaseContract()
    {
        var response = await client.GetAsync("/api/openapi.json");
        response.EnsureSuccessStatusCode();
        var schema = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        Assert.NotNull(schema["paths"]!["/api/groups/{group_id}/settings"]);
        Assert.NotNull(schema["components"]!["schemas"]!["GroupView"]!["properties"]!["invite_code"]);
        Assert.NotNull(schema["components"]!["schemas"]!["Preferences"]);
    }

    [Fact]
    public async Task LegacyPythonDatabaseAndTokensWorkWithoutRecreatingTheGroup()
    {
        using var legacy = new TestApp(legacy: true);
        using var oldClient = legacy.CreateClient();
        oldClient.DefaultRequestHeaders.Authorization = new("Bearer", "legacy-owner-token");
        var group = await Read<GroupView>(await oldClient.GetAsync("/api/groups/legacy-group"));
        Assert.Equal("legacy-invite", group.InviteCode);
        Assert.Equal(2, group.Members.Length);
        Assert.Equal(3, group.Settings.Slots);
        Assert.Equal(1, group.Plan.Consumed);
        Assert.Equal("fire", Assert.Single(group.Settings.CompletedIds));
        oldClient.DefaultRequestHeaders.Authorization = new("Bearer", "legacy-member-token");
        var member = await Read<Member>(await oldClient.GetAsync("/api/invites/legacy-invite/me"));
        Assert.Equal("بدر", member.Preferences.Name);
        Assert.True(member.Preferences.Vegetarian);
        using var content = new StringContent("{\"name\":\"بدر\",\"budget\":90}", Encoding.UTF8, "application/json");
        Assert.Equal(HttpStatusCode.OK, (await oldClient.PutAsync("/api/invites/legacy-invite/me", content)).StatusCode);
    }

    [Fact]
    public async Task CorsAllowsOnlyConfiguredOrigins()
    {
        foreach (var (origin, allowed) in new[] { ("http://localhost:8081", true), ("https://untrusted.example", false) })
        {
            using var request = new HttpRequestMessage(HttpMethod.Options, "/api/groups");
            request.Headers.Add("Origin", origin);
            request.Headers.Add("Access-Control-Request-Method", "POST");
            request.Headers.Add("Access-Control-Request-Headers", "content-type,authorization");
            var response = await client.SendAsync(request);
            Assert.Equal(allowed, response.Headers.Contains("Access-Control-Allow-Origin"));
        }
    }
}
