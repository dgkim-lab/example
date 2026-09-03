# Building the Flatpak

This project includes a Flatpak manifest at
[`org.example.HelloWorld.yml`](org.example.HelloWorld.yml). The build uses the
KDE Qt 6.10 runtime and SDK, so Qt does not need to be installed on the host.
Flatpak downloads the runtime and SDK from Flathub when they are needed.

## Install the host tools on CachyOS

```bash
sudo pacman -S --needed flatpak flatpak-builder
```

Add Flathub for the current user if it is not already configured:

```bash
flatpak remote-add --if-not-exists --user flathub \
  https://dl.flathub.org/repo/flathub.flatpakrepo
```

## Build and install locally

Run these commands from this directory (`example/helloworld/qt`):

```bash
flatpak-builder --user --install --force-clean \
  --install-deps-from=flathub \
  --repo=repo \
  build-flatpak \
  org.example.HelloWorld.yml
```

The first build downloads the KDE runtime and SDK and may take a few minutes.
The build output is kept in `build-flatpak/`; the local repository is kept in
`repo/`. Both directories are ignored by Git.

## Run the installed app

```bash
flatpak run org.example.HelloWorld
```

To remove the per-user installation:

```bash
flatpak uninstall --user org.example.HelloWorld
```

## Build without installing

Use this when you only want to verify the package build:

```bash
flatpak-builder --user --force-clean \
  --install-deps-from=flathub \
  build-flatpak \
  org.example.HelloWorld.yml
```

## Notes

- The manifest grants only IPC, X11 fallback, and Wayland access.
- The desktop entry and AppStream metadata are installed into the Flatpak.
- The manifest uses a local source directory, so run `flatpak-builder` from
  the `qt/` directory.

## References

- [Flatpak Qt documentation](https://docs.flatpak.org/en/latest/qt.html)
- [Building your first Flatpak](https://docs.flatpak.org/en/latest/first-build.html)
