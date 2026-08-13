// Fixture: a file with a verb attribute but no route base. It must
// contribute nothing rather than inventing a root-level path.
namespace Fixtures.Helpers;

public static class NotAController
{
    // [HttpGet] appears in prose here and must not be picked up.
    public static string Describe() => "helper";
}
