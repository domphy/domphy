import type { PartialElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";

function icon(): PartialElement {
    return {
        _onInsert: (node) => {
            if (node.tagName != "span") {
                console.warn(`"icon" primitive patch should use span tag`);
            }
        },
        style: {
            display: "inline-flex",
            alignItems: "center",
            verticalAlign: "middle",
            width: themeSpacing(6),
            height: themeSpacing(6),
        },
    };
}

export { icon };
