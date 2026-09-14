{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs
    # Chromium dependencies
    glib
    nss
    nspr
    atk
    at-spi2-atk
    cups
    libdrm
    mesa
    libgbm
    libxkbcommon
    libx11
    libxcomposite
    libxdamage
    libxext
    libxfixes
    libxrandr
    libxcb
    pango
    cairo
    alsa-lib
    dbus
    gtk3
    libGL
    vulkan-loader
    expat
    systemd
    libxkbcommon
  ];

  shellHook = ''
    export PLAYWRIGHT_BROWSERS_PATH=/home/mimir/.cache/ms-playwright
    export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [
      pkgs.glib pkgs.nss pkgs.nspr pkgs.atk pkgs.at-spi2-atk
      pkgs.cups pkgs.libdrm pkgs.mesa pkgs.libgbm pkgs.libxkbcommon
      pkgs.libx11 pkgs.libxcomposite pkgs.libxdamage
      pkgs.libxext pkgs.libxfixes pkgs.libxrandr
      pkgs.libxcb pkgs.pango pkgs.cairo pkgs.alsa-lib
      pkgs.dbus pkgs.gtk3 pkgs.libGL pkgs.vulkan-loader pkgs.expat pkgs.systemd
    ]}:$LD_LIBRARY_PATH"
  '';
}