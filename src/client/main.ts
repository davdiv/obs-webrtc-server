import { initI18n } from "./i18n";
import App from "./App.svelte";
import "./main.css";

initI18n();
const app = new App({
	target: document.getElementById("app")!,
});

export default app;
