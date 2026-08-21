# STRIDE n8n Automation Workflows

This directory contains the exported JSON definitions for the n8n automation workflows described in the STRIDE Architecture.

## Importing Workflows

1. Ensure n8n is running via Docker Compose:
   ```bash
   docker-compose --profile automation up -d
   ```
2. Navigate to your n8n UI at `http://localhost:5678` and log in using the credentials defined in your `.env` file (`N8N_USER` and `N8N_PASSWORD`).
3. Click **Add Workflow** in the top right.
4. Click the options menu (three dots) in the top right corner of the canvas and select **Import from File**.
5. Select `01-order-allocated.json` (or any other workflow).
6. Update the dummy credentials in the `Verify Signature` node to match your `WEBHOOK_SIGNING_SECRET` from the Spring Boot `.env`.
7. Configure your Slack/Email node credentials.
8. Activate the workflow!

## Included Workflows

### 1. `01-order-allocated.json`
Listens for the `/order.allocated` webhook. Verifies the signature, emails the customer, and alerts the `#warehouse-ops` Slack channel.

### 2. `02-stock-below-threshold.json`
Listens for the `/stock.below_threshold` webhook. If stock is at 0, it sends an URGENT Slack alert. Otherwise, it sends a standard low-stock warning.
