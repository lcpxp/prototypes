// Fixture: a controller with NO [ApiVersion]. Its routes are
// unversioned - assuming v1 is the trap this fixture guards.
using Microsoft.AspNetCore.Mvc;

namespace Fixtures.Unversioned;

[Route("api/widgets")]
[Authorize]
[ApiController]
public class UnversionedWidgetsController : ControllerBase
{
    [HttpGet("{widgetId}/gadgets")]
    public ActionResult List(string widgetId) => Ok();

    [HttpDelete("{widgetId}/gadgets/{gadgetId}")]
    public ActionResult Remove(string widgetId, string gadgetId) => Ok();
}
