# Sample files

| File | What it is | Use it for |
|---|---|---|
| `vendors.csv` | A purchase-register-shaped file: vendor names, GSTINs, PO numbers. Includes a typo, a truncated GSTIN and an `N/A`. | Drop it on the upload zone to see bulk input and error reporting. |
| `reference-example.csv` | A vendor-master-shaped file with names and addresses attached to each GSTIN. | Point `GSTIN_DATASET_PATH` at it to see the keyless `dataset` provider working. |

```bash
GSTIN_PROVIDER=dataset,local GSTIN_DATASET_PATH=samples/reference-example.csv npm start
```

> The business names and addresses in `reference-example.csv` are **invented
> placeholders**, marked `(SAMPLE DATA)`, attached to structurally valid GSTINs.
> They are there to exercise the loader, not to describe any real business.
