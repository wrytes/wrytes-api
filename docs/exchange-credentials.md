# Exchange Credentials

> **Note:** Wrytes API operates as a **Finance as a Service** platform. Exchange accounts (Kraken, Deribit) are owned and operated by Wrytes AG. Members do not connect their own exchange credentials.
>
> The exchange credential module has been removed from the member-facing API. Exchange API keys are configured at the operator level via environment variables.

## Operator Configuration

Exchange credentials for Wrytes AG's accounts are set via environment variables:

### Kraken

```env
KRAKEN_PUBLIC_KEY=
KRAKEN_PRIVATE_KEY=
KRAKEN_ADDRESS_KEY=
KRAKEN_CHF_WITHDRAW_KEY=   # key name for Wrytes AG's CHF bank account on Kraken
KRAKEN_EUR_WITHDRAW_KEY=   # key name for Wrytes AG's EUR bank account on Kraken
```

### Deribit

```env
DERIBIT_CLIENT_ID=
DERIBIT_CLIENT_SECRET=
DERIBIT_BASE_URL=           # wss://www.deribit.com/ws/api/v2
```

## Access Control

The `KRAKEN` and `DERIBIT` scopes still exist and are enforced on their respective endpoints. Only operator/admin accounts hold these scopes. Regular members do not have access to raw exchange endpoints.

See [scopes.md](./scopes.md) for the full scope reference.
