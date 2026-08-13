// Fixture: two actions whose placeholders are named differently but
// occupy the same slot. They must normalise to one shape.
using Microsoft.AspNetCore.Mvc;

namespace Fixtures.NamedSlots;

[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/things")]
public class NamedSlotsController : ControllerBase
{
    [HttpGet("{id}")]
    public ActionResult GetById(string id) => Ok();

    [HttpPut("{thingId}")]
    public ActionResult Update(string thingId) => Ok();
}
