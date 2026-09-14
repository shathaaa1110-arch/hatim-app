using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.Sqlite;

namespace Hatim.Api;

public sealed class Store
{
    private readonly string connectionString;
    public Store(string databasePath)
    {
        var path = Path.GetFullPath(databasePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = path,
            ForeignKeys = true,
            DefaultTimeout = 10
        }.ToString();
    }

    public static string Token(int bytes) => Convert.ToBase64String(RandomNumberGenerator.GetBytes(bytes))
        .TrimEnd('=').Replace('+', '-').Replace('/', '_');
    public static string Digest(string token) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public void Initialize()
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY, title TEXT NOT NULL,
                invite_code TEXT UNIQUE NOT NULL, owner_hash TEXT UNIQUE NOT NULL,
                settings TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS members (
                id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                token_hash TEXT UNIQUE NOT NULL, preferences TEXT NOT NULL,
                organizer INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS members_group ON members(group_id);
            PRAGMA user_version=1;
            """;
        command.ExecuteNonQuery();
    }

    // Read responses share one snapshot. Writers acquire a lock before checking capacity.
    public T Run<T>(Func<Database, T> operation, bool write = false)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var transaction = connection.BeginTransaction(deferred: !write);
        var result = operation(new Database(connection, transaction));
        transaction.Commit();
        return result;
    }
}

public sealed record GroupRow(string Id, string Title, string InviteCode, Settings Settings);

public sealed class Database(SqliteConnection connection, SqliteTransaction transaction)
{
    private SqliteCommand Command(string sql, params (string Name, object? Value)[] parameters)
    {
        var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        foreach (var (name, value) in parameters) command.Parameters.AddWithValue(name, value ?? DBNull.Value);
        return command;
    }
    public int Execute(string sql, params (string Name, object? Value)[] parameters)
    {
        using var command = Command(sql, parameters);
        return command.ExecuteNonQuery();
    }
    private GroupRow? Group(string sql, params (string Name, object? Value)[] parameters)
    {
        using var command = Command(sql, parameters);
        using var reader = command.ExecuteReader();
        return reader.Read() ? new(reader.GetString(0), reader.GetString(1), reader.GetString(2),
            ApiJson.Read<Settings>(reader.GetString(3))) : null;
    }
    public GroupRow RequireOwner(string id, string? authorization) =>
        Group("SELECT id,title,invite_code,settings FROM groups WHERE id=$id AND owner_hash=$hash",
            ("$id", id), ("$hash", Store.Digest(Bearer(authorization))))
        ?? throw new ApiException(404, "المجموعة غير متاحة أو الرابط غير صالح.");
    public GroupRow RequireInvite(string code) =>
        Group("SELECT id,title,invite_code,settings FROM groups WHERE invite_code=$code", ("$code", code))
        ?? throw new ApiException(404, "دعوة غير صالحة. اطلب رابطًا جديدًا من المنظّم.");
    public Member[] Members(string groupId)
    {
        using var command = Command("SELECT id,preferences,organizer FROM members WHERE group_id=$id ORDER BY created_at,rowid", ("$id", groupId));
        using var reader = command.ExecuteReader();
        List<Member> members = [];
        while (reader.Read()) members.Add(ReadMember(reader));
        return members.ToArray();
    }
    public Member RequireMember(string code, string? authorization)
    {
        var group = RequireInvite(code);
        using var command = Command("SELECT id,preferences,organizer FROM members WHERE group_id=$id AND token_hash=$hash AND organizer=0",
            ("$id", group.Id), ("$hash", Store.Digest(Bearer(authorization))));
        using var reader = command.ExecuteReader();
        return reader.Read() ? ReadMember(reader)
            : throw new ApiException(404, "تعذّر الوصول لملفك. يمكنك الانضمام من جديد.");
    }
    private static Member ReadMember(SqliteDataReader reader) =>
        new(reader.GetString(0), ApiJson.Read<Preferences>(reader.GetString(1)), reader.GetBoolean(2));
    private static string Bearer(string? header) => header?.StartsWith("Bearer ", StringComparison.Ordinal) == true
        ? header[7..] : "";
}
public sealed class ApiException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}
