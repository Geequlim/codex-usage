function buildTooltipText(title, sections) {
    let pieces = [];

    sections.forEach(section => {
        if (!section) {
            return;
        }

        if (pieces.length > 0) {
            pieces.push("");
        }

        if (section.title) {
            pieces.push(String(section.title));
        }

        (section.lines || []).forEach(line => {
            pieces.push(String(line));
        });
    });

    return pieces.join("\n");
}

module.exports = {
    buildTooltipText,
};
