/**
 * Copies text to the clipboard using the modern Clipboard API if available,
 * falling back to document.execCommand('copy') for compatibility in non-secure contexts.
 * @param {string} text - The text to copy.
 * @returns {Promise<boolean>} - Resolves to true if successful, false otherwise.
 */
export const copyToClipboard = async (text) => {
    if (!text) return false;

    // Try modern API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error("Modern Clipboard API failed, attempting fallback:", err);
        }
    }

    // Fallback: document.execCommand('copy')
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Ensure textarea is not visible but part of the DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        return successful;
    } catch (err) {
        console.error("Fallback Clipboard copy failed:", err);
        return false;
    }
};
