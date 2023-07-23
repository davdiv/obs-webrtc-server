import { addMessages, init, getLocaleFromNavigator } from "svelte-i18n";

const localeRegExp = /^\.\/i18n\/(.*)\.json$/;
const messages = import.meta.glob("./i18n/*.json", { eager: true, import: "default" });

export const initI18n = () => {
	for (const key of Object.keys(messages)) {
		const lang = localeRegExp.exec(key);
		if (lang) {
			addMessages(lang[1], messages[key] as any);
		}
	}

	init({
		fallbackLocale: "en",
		initialLocale: getLocaleFromNavigator(),
	});
};
