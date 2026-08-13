// Fixture: a versioned controller whose actions compose onto the base.
// Synthetic - written for this repo's benchmarks, not copied from any
// product source.
using Microsoft.AspNetCore.Mvc;

namespace Fixtures.Composed;

[ApiVersion("2.0")]
[Route("api/v{version:apiVersion}/admin/widget")]
[Authorize]
public class ComposedController : ControllerBase
{
    [HttpGet]
    public ActionResult GetAll() => Ok();

    [HttpPatch("price-sheets/{priceSheetId}")]
    public ActionResult Patch(string priceSheetId) => Ok();

    [HttpPost("{id}/gadgets/{gadgetId}")]
    public ActionResult Attach(string id, string gadgetId) => Ok();
}
