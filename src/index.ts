import express from "express";
import { WebhookController } from "./controllers/webhook.controller";
import { GithubController } from "./controllers/github.controller";

const PORT = process.env.PORT || 3000;

const app = express();
const webhookController = new WebhookController();
const githubController = new GithubController();

// Use express.json() instead of body-parser
app.use(express.json());

// Routes
app.post("/webhook", webhookController.handleWebhook);
app.post("/webhook/test", webhookController.testWebhook);
app.post("/github/announce", githubController.announce);

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
