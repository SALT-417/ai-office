import { createApp } from './app';
import { getServerConfig } from './config';

const config = getServerConfig();
const app = createApp({ config });

app.listen(config.port, config.host, () => {
  console.log(`[AI OFFICE API] http://${config.host}:${config.port}`);
  console.log(`[AI OFFICE API] Ollama model: ${config.ollamaModel}`);
});
