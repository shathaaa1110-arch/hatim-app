using Microsoft.AspNetCore.Mvc;

namespace Hatim.Api;

[ApiController]
[Route("api")]
[Produces("application/json")]
public sealed class ApiController(Store store, Catalog catalog) : ControllerBase
{
    private string? Authorization => Request.Headers.Authorization;
    private GroupView View(Database db, GroupRow row)
    {
        var members = db.Members(row.Id);
        return new(row.Id, row.Title, row.InviteCode, row.Settings, members,
            Planner.Build(catalog.Experiences, members, row.Settings));
    }

    [HttpGet("health")]
    public object Health() => new { status = "ok", version = "1.0.0", catalog_mode = "fictional-demo", backend = "dotnet" };

    [HttpGet("experiences")]
    public IReadOnlyList<Experience> Experiences() => catalog.Experiences;

    [HttpPost("groups")]
    [ProducesResponseType<GroupCreated>(StatusCodes.Status201Created)]
    public ActionResult<GroupCreated> Create(CreateGroup body)
    {
        var result = store.Run(db =>
        {
            var id = Store.Token(12);
            var owner = Store.Token(32);
            db.Execute("INSERT INTO groups(id,title,invite_code,owner_hash,settings) VALUES($id,$title,$code,$hash,$settings)",
                ("$id", id), ("$title", body.Title), ("$code", Store.Token(18)),
                ("$hash", Store.Digest(owner)), ("$settings", ApiJson.Text(new Settings())));
            db.Execute("INSERT INTO members(id,group_id,token_hash,preferences,organizer) VALUES($id,$group,$hash,$preferences,1)",
                ("$id", Store.Token(12)), ("$group", id), ("$hash", Store.Digest(Store.Token(32))),
                ("$preferences", ApiJson.Text(body.Preferences)));
            return new GroupCreated(owner, View(db, db.RequireOwner(id, $"Bearer {owner}")));
        }, write: true);
        return StatusCode(201, result);
    }

    [HttpGet("groups/{group_id}")]
    public GroupView Get(string group_id) => store.Run(db => View(db, db.RequireOwner(group_id, Authorization)));

    [HttpPut("groups/{group_id}/settings")]
    public GroupView UpdateSettings(string group_id, Settings body)
    {
        var ids = body.PocketIds.Concat(body.CompletedIds).Concat(body.AnchorId is null ? [] : new[] { body.AnchorId });
        if (ids.Any(id => !catalog.Ids.Contains(id))) throw new ApiException(422, "تجربة غير موجودة.");
        return store.Run(db =>
        {
            db.RequireOwner(group_id, Authorization);
            db.Execute("UPDATE groups SET settings=$settings WHERE id=$id", ("$settings", ApiJson.Text(body)), ("$id", group_id));
            return View(db, db.RequireOwner(group_id, Authorization));
        }, write: true);
    }

    [HttpPut("groups/{group_id}/profile")]
    public GroupView UpdateProfile(string group_id, Preferences body) => store.Run(db =>
    {
        var row = db.RequireOwner(group_id, Authorization);
        db.Execute("UPDATE members SET preferences=$preferences WHERE group_id=$id AND organizer=1",
            ("$preferences", ApiJson.Text(body)), ("$id", group_id));
        return View(db, row);
    }, write: true);

    [HttpDelete("groups/{group_id}/members/{member_id}")]
    public GroupView Remove(string group_id, string member_id) => store.Run(db =>
    {
        var row = db.RequireOwner(group_id, Authorization);
        var changed = db.Execute("DELETE FROM members WHERE id=$member AND group_id=$group AND organizer=0",
            ("$member", member_id), ("$group", group_id));
        if (changed != 1) throw new ApiException(404, "العضو غير موجود أو هو منظّم المجموعة.");
        return View(db, row);
    }, write: true);

    [HttpGet("invites/{code}")]
    public InviteView Invite(string code) => store.Run(db =>
    {
        var group = View(db, db.RequireInvite(code));
        // An invitation exposes only the shared plan, never private constraints or adaptations.
        var selected = group.Plan.Selected.Select(d => d with
        {
            Adaptations = [],
            Reason = catalog.Experiences.Single(e => e.Id == d.ExperienceId).Why
        }).ToArray();
        return new InviteView(group.Title, group.Members.Select(m => m.Preferences.Name).ToArray(),
            group.Settings.Slots, selected,
            group.Plan.AnchorIssue is null ? null : "المنظّم يراجع توافق الركيزة مع المجموعة. لم نستبدلها بصمت.",
            group.Plan.Consumed);
    });

    [HttpPost("invites/{code}/members")]
    [ProducesResponseType<MemberCreated>(StatusCodes.Status201Created)]
    public ActionResult<MemberCreated> Join(string code, Preferences body)
    {
        var result = store.Run(db =>
        {
            var group = db.RequireInvite(code);
            if (db.Members(group.Id).Length >= 12) throw new ApiException(409, "المجموعة ممتلئة (١٢ شخصًا كحد أقصى).");
            var id = Store.Token(12);
            var token = Store.Token(32);
            db.Execute("INSERT INTO members(id,group_id,token_hash,preferences) VALUES($id,$group,$hash,$preferences)",
                ("$id", id), ("$group", group.Id), ("$hash", Store.Digest(token)), ("$preferences", ApiJson.Text(body)));
            return new MemberCreated(token, new Member(id, body));
        }, write: true);
        return StatusCode(201, result);
    }

    [HttpGet("invites/{code}/me")]
    public Member Me(string code) => store.Run(db => db.RequireMember(code, Authorization));

    [HttpPut("invites/{code}/me")]
    public Member UpdateMe(string code, Preferences body) => store.Run(db =>
    {
        var member = db.RequireMember(code, Authorization);
        db.Execute("UPDATE members SET preferences=$preferences WHERE id=$id",
            ("$preferences", ApiJson.Text(body)), ("$id", member.Id));
        return member with { Preferences = body };
    }, write: true);
}
