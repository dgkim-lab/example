# managing local cache

## Listing local cache

```shell
$ hf cache ls
ID                                                    SIZE     LAST_ACCESSED LAST_MODIFIED REFS
----------------------------------------------------- -------- ------------- ------------- ----
model/runwayml/stable-diffusion-v1-5                      5.5G 1 day ago     1 year ago    main
model/stabilityai/stable-diffusion-3-medium-diffusers    15.5G 1 day ago     2 years ago   main
model/stabilityai/stable-diffusion-3.5-large             27.6G 1 day ago     7 months ago  main

Found 3 repo(s) for a total of 4 revision(s) and 48.6G on disk.
```

## Delete local cache model

```shell
$ hf cache rm model/stabilityai/stable-diffusion-3.5-large
About to delete 1 repo(s) totalling 27.6G.
  - model/stabilityai/stable-diffusion-3.5-large (entire repo)
Proceed with deletion? [y/N]: y
Delete repo: /Users/dgkim/AI/huggingface/hub/models--stabilityai--stable-diffusion-3.5-large
Cache deletion done. Saved 27.6G.
Deleted 1 repo(s) and 1 revision(s); freed 27.6G.
```

