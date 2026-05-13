/** Human-readable visit workflow status (Bulgarian UI). */
export function visitStatusLabelBg(status: string | undefined): string {
  switch (status) {
    case "draft":
      return "Ново";
    case "in_progress":
      return "В работа";
    case "ready":
      return "Готов";
    case "finalized":
      return "Приключено";
    default:
      return status?.trim() ? status : "—";
  }
}
