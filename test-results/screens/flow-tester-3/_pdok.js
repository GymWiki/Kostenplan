const { antwoord, TEGEL } = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
async function pdokNepRoutes(context) {
  await context.route("https://api.pdok.nl/**", (route) => {
    const r = antwoord(route.request().url());
    return route.fulfill({ status: r.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(r.body) });
  });
  await context.route("https://service.pdok.nl/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: TEGEL }));
}
module.exports = { pdokNepRoutes };
