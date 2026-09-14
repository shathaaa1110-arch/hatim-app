using Hatim.Api;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);
// Cloudflare terminates public HTTPS; the local service listens on loopback by default.
if (builder.Configuration["urls"] is null) builder.WebHost.UseUrls("http://127.0.0.1:8000");
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 16384);
builder.Services.AddSingleton<Catalog>();
builder.Services.AddSingleton(sp => new Store(
    sp.GetRequiredService<IConfiguration>()["HATIM_DB"]
    ?? Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "data", "hatim.sqlite3"))));
builder.Services.AddControllers().AddJsonOptions(options => ApiJson.Configure(options.JsonSerializerOptions));
builder.Services.ConfigureHttpJsonOptions(options => ApiJson.Configure(options.SerializerOptions));
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = _ => new UnprocessableEntityObjectResult(
        new ApiError("راجع البيانات وحاول مرة ثانية."));
});
builder.Services.AddOpenApi(options => options.AddDocumentTransformer((document, _, _) =>
{
    document.Info.Title = "Hatim API";
    document.Info.Version = "1.0.0";
    return Task.CompletedTask;
}));
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins((builder.Configuration["HATIM_CORS_ORIGINS"] ?? "http://localhost:8081,http://localhost:19006").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
    .WithMethods("GET", "POST", "PUT", "DELETE").WithHeaders("Authorization", "Content-Type")));

var app = builder.Build();
app.Services.GetRequiredService<Store>().Initialize();
app.Use(async (context, next) =>
{
    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    if (context.Request.Path.StartsWithSegments("/api")) context.Response.Headers.CacheControl = "no-store";
    try
    {
        if (context.Request.ContentLength > 16384) throw new ApiException(413, "Request too large");
        // Also bound chunked requests; do not rely only on Content-Length.
        if (context.Request.Method is "POST" or "PUT" or "PATCH")
        {
            var originalBody = context.Request.Body;
            using var buffered = new MemoryStream();
            var buffer = new byte[4096];
            int read;
            while ((read = await originalBody.ReadAsync(buffer, context.RequestAborted)) > 0)
            {
                if (buffered.Length + read > 16384) throw new ApiException(413, "Request too large");
                buffered.Write(buffer, 0, read);
            }
            buffered.Position = 0;
            context.Request.Body = buffered;
            try { await next(context); }
            finally { context.Request.Body = originalBody; }
        }
        else await next(context);
    }
    catch (ApiException error)
    {
        context.Response.StatusCode = error.Status;
        await context.Response.WriteAsJsonAsync(new ApiError(error.Message));
    }
    catch (BadHttpRequestException error) when (error.StatusCode == 413)
    {
        context.Response.StatusCode = 413;
        await context.Response.WriteAsJsonAsync(new ApiError("Request too large"));
    }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
    catch (Exception error) when (!context.Response.HasStarted)
    {
        app.Logger.LogError(error, "Request failed");
        context.Response.StatusCode = 500;
        await context.Response.WriteAsJsonAsync(new ApiError("حاتم غير متاح مؤقتًا. حاول مرة ثانية بعد شوي."));
    }
});
app.UseCors();
app.MapControllers();
app.MapOpenApi("/api/openapi.json");
app.MapGet("/api/docs", () => Results.Redirect("/api/openapi.json")).ExcludeFromDescription();

// The web export and the API share one origin, including public invitations.
var webRoot = Path.GetFullPath(builder.Configuration["HATIM_WEB_ROOT"]
    ?? Path.Combine(builder.Environment.ContentRootPath, "..", "..", "dist"));
if (Directory.Exists(webRoot))
{
    app.UseStaticFiles(new StaticFileOptions { FileProvider = new PhysicalFileProvider(webRoot) });
    var index = Path.Combine(webRoot, "index.html");
    app.MapGet("/", () => Results.File(index, "text/html")).ExcludeFromDescription();
    app.MapGet("/join/{code}", (HttpResponse response) =>
    {
        response.Headers.CacheControl = "no-store";
        return Results.File(index, "text/html");
    }).ExcludeFromDescription();
}
app.MapFallback("/api/{**path}", () => Results.Json(new ApiError("Unknown API route"), statusCode: 404)).ExcludeFromDescription();
app.Run();

// Public entry point for WebApplicationFactory integration tests.
public partial class Program;
