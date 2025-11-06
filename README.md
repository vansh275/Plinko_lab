# Daphnis Labs - Full-Stack Developer Intern (Plinko Lab)

This is a take-home assignment to build a provably-fair, interactive Plinko game. The project is built using the Next.js App Router, with API routes serving as the backend and Prisma/SQLite for the database.

## 🚀 Live Links

* **Live App:** `[ADD YOUR VERCEL/DEPLOYMENT URL HERE]`
* **Verifier Page:** `[ADD YOUR VERCEL/DEPLOYMENT URL HERE]/verify`

---

## 🛠️ How to Run Locally

1.  **Prerequisites:**
    * Node.js (v18+)
    * npm

2.  **Clone the repository:**
    ```bash
    git clone [YOUR_REPO_URL]
    cd plinko-lab
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Set up the environment:**
    Create a `.env` file in the root of the project and add your database URL. (For this project, we use a simple local SQLite file).
    ```
    # .env
    DATABASE_URL="file:./dev.db"
    ```

5.  **Run database migration:**
    This will create the `dev.db` file and set up your `Round` table.
    ```bash
    npx prisma migrate dev
    ```

6.  **Run the project:**
    ```bash
    npm run dev
    ```
    Your app will be available at `http://localhost:3000`.

---

## 🏗️ Architecture & Tech Stack

* **Framework:** **Next.js 14 (App Router)** - Used for both the React frontend and the serverless API routes.
* **Database:** **SQLite (via Prisma)** - Prisma is used as the ORM to model and query the `Round` data.
* **Language:** **TypeScript**
* **Fairness Engine:**
    * **Hashing:** Node.js built-in `crypto` module for **SHA-256**.
    * **PRNG:** A custom **`xorshift32`** implementation, as recommended by the test vectors[cite: 118].
* **Animation:** **HTML Canvas** with a `requestAnimationFrame` loop to create a deterministic animation that follows the backend's path.

---

## 🎲 Fairness Specification

This project implements a **Commit-Reveal** protocol to ensure provably-fair outcomes[cite: 25].

1.  **Commit Phase:** The server generates a secret `serverSeed` and `nonce`, and publishes a `commitHex`.
    * `commitHex = SHA256(serverSeed + ":" + nonce)`

2.  **Play Phase:** The user provides a `clientSeed`. The server combines them to create a master seed.
    * `combinedSeed = SHA256(serverSeed + ":" + clientSeed + ":" + nonce)`

3.  **PRNG:** A `xorshift32` pseudo-random number generator is seeded using the **first 4 bytes (big-endian)** of the `combinedSeed`[cite: 118].

4.  **Deterministic Engine:** The game is 100% deterministic based on this PRNG stream[cite: 34, 47].
    * **Peg Map:** The 12-row `pegMap` is generated first. Each peg's `leftBias` is calculated using the formula `0.5 + (rand() - 0.5) * 0.2` and rounded to 6 decimal places for stable hashing[cite: 41, 120].
    * **Drop Influence:** The `dropColumn` provides a small bias adjustment: `leftBiasAdj = (dropColumn - 6) * 0.01`[cite: 44].
    * **Path:** The ball's path is calculated. At each row, a new `rand()` is drawn; if `rnd < (bias + leftBiasAdj)`, the ball moves Left, otherwise Right. The final `binIndex` is the total number of Right moves[cite: 45].

5.  **Verification:** The public `/verify` page re-runs this entire computation using the (now public) `serverSeed`, `clientSeed`, `nonce`, and `dropColumn` to prove the `binIndex` was correct and not tampered with.

---

## 🤖 AI Usage

Per the assignment’s encouragement, I leveraged an AI assistant to accelerate development and bridge gaps in my familiarity with the specific tech stack. My primary focus was on directing the core logic and architecture.

* **Understanding & Scaffolding:**
  I used the AI to summarize and understand the assignment’s requirements. Since I am newer to Next.js and TypeScript, I used the AI to provide correct syntax and generate boilerplate for API routes and React components.

* **Code Snippets:**
  To speed up the process, I used the AI for a few specific code snippets. Most notably, the **`xorshift32` PRNG implementation was fully written by the AI** based on the assignment’s test vector requirements.

* **Logic & Concepts:**
  The **overall logic, data flow, and conceptual design were my own**. I directed the AI on *how* the deterministic engine should work, *what* the API endpoints needed to do, and *how* the components should interact.

* **Debugging:**
  The AI was helpful in debugging complex issues, particularly the React re-render loops (which required `useCallback`) that occurred when toggling sound or the debug grid.


## ⏱️ Time Log (Rough Estimate)

The assignment suggested a timebox of ~8 hours[cite: 6].

* **Project Setup & Core Logic (2.5 hours):** Setting up the project, implementing the `xorshift32` PRNG, and writing the core fairness functions (`getCommitHex`, `getCombinedSeed`). Getting the unit tests to pass the provided vectors.
* **Backend & API (1.5 hours):** Building the Prisma schema and all Next.js API endpoints (`/commit`, `/start`, `/reveal`, `/verify`).
* **Frontend & Animation (3 hours):** Building the React UI, controls, and the HTML Canvas animation. This took the most time, especially the logic to make the ball follow the deterministic path.
* **Polish & Debugging (1.5 hours):** Implementing sound, keyboard controls, easter eggs, and fixing the various React re-render bugs.
* **Total: ~8.5 hours**

---

## 🔮 Future Improvements

Given more time, I would focus on:

* **Better Physics:** Replace the simple canvas animation with a proper physics library like **Matter.js**, as suggested in the stretch goals[cite: 50]. I would still use the deterministic `path` to "nudge" the ball, ensuring the outcome remains provably fair.
* **UI Polish:** Add the "bin pulse + confetti on landing" animation [cite: 19] and spend more time on a fully responsive mobile layout.
* **Bonus Features:** Implement one of the bonus features, like a realtime session log of recent rounds[cite: 109, 151].