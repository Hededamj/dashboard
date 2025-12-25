export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/api/metrics/:path*", "/api/trends/:path*", "/api/activity/:path*"],
};
