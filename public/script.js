const textInput = document.getElementById("textInput");
const fileInput = document.getElementById("fileInput");

const inputWordCount =
    document.getElementById("inputWordCount");

const summarizeBtn =
    document.getElementById("summarizeBtn");

const buttonText =
    document.getElementById("buttonText");

const loader =
    document.getElementById("loader");

const summaryLength =
    document.getElementById("summaryLength");

const resultSection =
    document.getElementById("resultSection");

const summaryText =
    document.getElementById("summaryText");

const originalCount =
    document.getElementById("originalCount");

const summaryCount =
    document.getElementById("summaryCount");

const reductionCount =
    document.getElementById("reductionCount");

const copyBtn =
    document.getElementById("copyBtn");

const downloadBtn =
    document.getElementById("downloadBtn");

const errorMessage =
    document.getElementById("errorMessage");

const fileName =
    document.getElementById("fileName");


/*
    Count words
*/
function countWords(text) {

    if (!text.trim()) {
        return 0;
    }

    return text
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;
}


/*
    Update word count
*/
function updateWordCount() {

    const count = countWords(textInput.value);

    inputWordCount.textContent =
        count.toLocaleString();
}


textInput.addEventListener(
    "input",
    updateWordCount
);


/*
    File upload
*/
fileInput.addEventListener(
    "change",
    function () {

        const file = fileInput.files[0];

        if (!file) {
            return;
        }


        // Check file type
        if (
            file.type !== "text/plain" &&
            !file.name.toLowerCase().endsWith(".txt")
        ) {

            showError(
                "Please upload a valid .txt file."
            );

            fileInput.value = "";

            return;
        }


        // Check file size - 2MB
        const maxSize =
            2 * 1024 * 1024;

        if (file.size > maxSize) {

            showError(
                "File is too large. Maximum size is 2 MB."
            );

            fileInput.value = "";

            return;
        }


        const reader = new FileReader();


        reader.onload = function (event) {

            textInput.value =
                event.target.result;

            fileName.textContent =
                file.name;

            updateWordCount();

            hideError();
        };


        reader.onerror = function () {

            showError(
                "Unable to read the selected file."
            );

        };


        reader.readAsText(file);

    }
);


/*
    Generate summary
*/
summarizeBtn.addEventListener(
    "click",
    generateSummary
);


async function generateSummary() {

    const text =
        textInput.value.trim();

    const length =
        summaryLength.value;


    // Validation
    if (!text) {

        showError(
            "Please enter some text or upload a .txt file."
        );

        return;
    }


    if (text.length < 20) {

        showError(
            "Please enter at least 20 characters."
        );

        return;
    }


    if (text.length > 100000) {

        showError(
            "Text is too large. Maximum allowed is 100,000 characters."
        );

        return;
    }


    hideError();

    setLoading(true);


    try {

        const response =
            await fetch("/api/summarize", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    text,
                    length
                })

            });


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to generate summary."
            );

        }


        // Display summary
        summaryText.textContent =
            data.summary;


        // Display statistics
        originalCount.textContent =
            data.originalWordCount.toLocaleString();


        summaryCount.textContent =
            data.summaryWordCount.toLocaleString();


        reductionCount.textContent =
            `${data.reduction}%`;


        // Show results
        resultSection.classList.remove(
            "hidden"
        );


        // Scroll to results
        resultSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


    } catch (error) {

        console.error("OpenAI API Error:", error);

        // No API credits
        if (
            error.status === 429 &&
            (
                error.code === "insufficient_quota" ||
                error.code === "credit_balance_exhausted" ||
                error.type === "insufficient_quota"
            )
        ) {

            return res.status(402).json({
                error:
                    "OpenAI API credits are exhausted. Please add API credits to continue."
            });
        }


        // Rate limit
        if (error.status === 429) {

            return res.status(429).json({
                error:
                    "Too many API requests. Please wait a moment and try again."
            });
        }


        // Authentication
        if (error.status === 401) {

            return res.status(401).json({
                error:
                    "Invalid OpenAI API key. Please check your .env configuration."
            });
        }


        // Generic error
        return res.status(500).json({
            error:
                "Something went wrong while generating the summary."
        });
    }
    finally {

        setLoading(false);

    }
}


/*
    Loading state
*/
function setLoading(isLoading) {

    summarizeBtn.disabled = isLoading;

    if (isLoading) {

        buttonText.textContent =
            "AI is analyzing...";

        loader.classList.remove("hidden");

    } else {

        buttonText.textContent =
            "✨ Generate Summary";

        loader.classList.add("hidden");
    }
}



/*
    Copy summary
*/
copyBtn.addEventListener(
    "click",
    async function () {

        const summary =
            summaryText.textContent.trim();


        if (!summary) {
            return;
        }


        try {

            await navigator.clipboard.writeText(
                summary
            );


            const originalText =
                copyBtn.textContent;


            copyBtn.textContent =
                "✓ Copied!";


            setTimeout(() => {

                copyBtn.textContent =
                    originalText;

            }, 1500);


        } catch (error) {

            showError(
                "Unable to copy summary."
            );

        }

    }
);


/*
    Download summary
*/
downloadBtn.addEventListener(
    "click",
    function () {

        const summary =
            summaryText.textContent.trim();


        if (!summary) {
            return;
        }


        const blob =
            new Blob(
                [summary],
                {
                    type: "text/plain;charset=utf-8"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        link.href = url;

        link.download =
            "ai-summary.txt";


        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);


        URL.revokeObjectURL(url);

    }
);


/*
    Show error
*/
function showError(message) {

    errorMessage.textContent =
        message;

    errorMessage.classList.remove(
        "hidden"
    );

}


/*
    Hide error
*/
function hideError() {

    errorMessage.classList.add(
        "hidden"
    );

}
