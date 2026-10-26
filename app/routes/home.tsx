import { t } from "../shared/i18n";
export { HomePage as default } from "../modules/booking";
import { publicSalon } from "../config/salon";
export function meta() {
  return [
    { title: t("copy.3617bd8827", { value0: publicSalon.name }) },
    { name: "description", content: publicSalon.description },
  ];
}
