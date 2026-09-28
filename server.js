require("dotenv").config();

const express = require("express");
const path = require("path");

const {
    GoogleGenAI
} = require("@google/genai");


const app = express();

const PORT =
    process.env.PORT || 3000;


// =====================================================
// GEMINI CLIENT
// =====================================================

if (!process.env.GEMINI_API_KEY) {

    console.error(
        "ERROR: GEMINI_API_KEY is missing from .env"
    );

    process.exit(1);
}


const ai =
    new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
    express.json({
        limit: "5mb"
    })
);


app.use(
    express.urlencoded({
        extended: true,
        limit: "5mb"
    })
);


// Serve frontend

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// =====================================================
// SUMMARIZE API
// =====================================================

app.post(
    "/api/summarize",
    async (req, res) => {

        try {

            const {
                text,
                length
            } = req.body;


            // ---------------------------------------------
            // VALIDATION
            // ---------------------------------------------

            if (
                !text ||
                typeof text !== "string"
            ) {

                return res.status(400).json({

                    error:
                        "Please provide text to summarize."

                });

            }


            const cleanedText =
                text.trim();


            if (
                cleanedText.length < 20
            ) {

                return res.status(400).json({

                    error:
                        "Please enter at least 20 characters."

                });

            }


            if (
                cleanedText.length > 100000
            ) {

                return res.status(400).json({

                    error:
                        "Text is too large. Maximum allowed is 100,000 characters."

                });

            }


            // ---------------------------------------------
            // SUMMARY LENGTH
            // ---------------------------------------------

            let lengthInstruction;


            switch (length) {

                case "short":

                    lengthInstruction =
                        "Create a very concise summary in 2 to 4 sentences.";

                    break;


                case "medium":

                    lengthInstruction =
                        "Create a balanced summary covering the important points in 1 to 2 paragraphs.";

                    break;


                case "long":

                    lengthInstruction =
                        "Create a detailed summary covering the major ideas, important facts, and conclusions.";

                    break;


                default:

                    lengthInstruction =
                        "Create a balanced summary covering the important points.";

            }


            // ---------------------------------------------
            // GEMINI PROMPT
            // ---------------------------------------------

            const prompt = `

You are an expert text summarization assistant.

Summarize the text provided below.

Requirements:

1. Preserve the original meaning.
2. Do not invent facts.
3. Do not add information that is not present.
4. Remove unnecessary repetition.
5. Keep the important facts and ideas.
6. Use clear and natural language.
7. Do not mention that you are an AI.
8. Do not provide opinions.
9. Return ONLY the summary.

Summary length requirement:

${lengthInstruction}


TEXT TO SUMMARIZE:

${cleanedText}

`;


            // ---------------------------------------------
            // GEMINI REQUEST
            // ---------------------------------------------

            const response =
                await ai.models.generateContent({

                    // Change this model if needed
                    model:
                        "gemini-3.6-flash",

                    contents:
                        prompt,

                    config: {

                        temperature: 0.2,

                        maxOutputTokens:
                            2000

                    }

                });


            // ---------------------------------------------
            // GET GENERATED TEXT
            // ---------------------------------------------

            const summary =
                response.text?.trim();


            if (!summary) {

                throw new Error(
                    "Gemini returned an empty response."
                );

            }


            // ---------------------------------------------
            // WORD COUNTS
            // ---------------------------------------------

            const originalWordCount =
                countWords(
                    cleanedText
                );


            const summaryWordCount =
                countWords(
                    summary
                );


            // ---------------------------------------------
            // REDUCTION
            // ---------------------------------------------

            let reduction = 0;


            if (
                originalWordCount > 0
            ) {

                reduction =
                    Math.round(

                        (
                            (
                                originalWordCount -
                                summaryWordCount
                            )
                            /
                            originalWordCount
                        )
                        * 100

                    );

            }


            // Prevent negative values

            reduction =
                Math.max(
                    0,
                    reduction
                );


            // ---------------------------------------------
            // SEND RESULT
            // ---------------------------------------------

            res.json({

                success: true,

                summary:

                    summary,

                originalWordCount:

                    originalWordCount,

                summaryWordCount:

                    summaryWordCount,

                reduction:

                    reduction

            });

        }


        // =================================================
        // ERROR HANDLING
        // =================================================

        catch (error) {

            console.error(
                "Gemini API Error:",
                error
            );


            // ---------------------------------------------
            // RATE LIMIT
            // ---------------------------------------------

            if (
                error.status === 429
            ) {

                return res.status(429).json({

                    error:
                        "Gemini API rate limit reached. Please wait a moment and try again."

                });

            }


            // ---------------------------------------------
            // AUTHENTICATION
            // ---------------------------------------------

            if (
                error.status === 401 ||
                error.status === 403
            ) {

                return res.status(401).json({

                    error:
                        "Gemini API authentication failed. Please check your GEMINI_API_KEY."

                });

            }


            // ---------------------------------------------
            // GENERIC ERROR
            // ---------------------------------------------

            return res.status(500).json({

                error:
                    "Gemini could not generate the summary. Please try again."

            });

        }

    }
);


// =====================================================
// WORD COUNT FUNCTION
// =====================================================

function countWords(text) {

    if (!text) {

        return 0;

    }


    return text
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;

}


// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            status: "OK",

            provider: "Google Gemini",

            message:
                "AI Text Summarizer is running."

        });

    }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            `AI Text Summarizer running at http://localhost:${PORT}`
        );

        console.log(
            "AI Provider: Google Gemini"
        );

    }
);
