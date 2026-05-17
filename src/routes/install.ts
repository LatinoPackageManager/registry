import { Router } from "../router";

export default function registerInstallScripts(router: Router) {
    const INSTALL_PS1 = "https://raw.githubusercontent.com/LatinoPackageManager/cli/refs/heads/main/scripts/install.ps1";
    const INSTALL_SH = "https://raw.githubusercontent.com/LatinoPackageManager/cli/refs/heads/main/scripts/install.sh";

    router.on("GET", "/install.ps1", () => {
        return Response.redirect(INSTALL_PS1, 302);
    });

    router.on("GET", "/install.sh", () => {
        return Response.redirect(INSTALL_SH, 302);
    });

    router.on("GET", "/install", () => {
        return Response.redirect(INSTALL_SH, 302);
    });
}
