// Fixture: the [controller] token, on a class declared inside a
// namespace block so its attributes are indented.
using Microsoft.AspNetCore.Mvc;

namespace Fixtures.Token
{
    [Route("api/[controller]")]
    [Authorize]
    [ApiController]
    public class TokenController : ControllerBase
    {
        [HttpGet("CurrencyCodes")]
        public ActionResult Currencies() => Ok();
    }
}
