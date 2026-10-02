# ESP Flash Backup

Before flashing new firmware, back up the entire ESP flash using `esptool`.

## 1. Check Flash Size

```bash
esptool --port COM3 flash-id
```

Check the detected flash size (e.g. `4MB`).

## 2. Backup Flash

Example for a 4 MB flash:

```bash
esptool --port COM3 read-flash 0x000000 0x400000 esp_full_backup.bin
```

Common flash sizes:

| Flash Size | Size Argument |
|---|---|
| 2 MB | `0x200000` |
| 4 MB | `0x400000` |
| 8 MB | `0x800000` |
| 16 MB | `0x1000000` |

## 3. Restore Flash

```bash
esptool --port COM3 write-flash 0x000000 esp_full_backup.bin
```

> Note: This backs up the flash contents only. eFuses are not included.
