
const searchForm = document.getElementById("search-form");
const wordInput = document.getElementById("word-input");
const searchButton = document.getElementById("search-button");
const results = document.getElementById("results");
const statusMessage = document.getElementById("status");

async function fetchWord(word) {
  const url =
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

  let response;

  try {
    response = await fetch(url);
  } catch {
    throw new Error(
      "Network error. Please check your internet connection and try again."
    );
  }

  if (response.status === 404) {
    throw new Error("Word not found. Please check the spelling and try again.");
  }

  if (!response.ok) {
    throw new Error("The dictionary service is unavailable. Please try again later.");
  }

  const data = await response.json();

  if (!Array.isArray(data) || !data[0]) {
    throw new Error("No dictionary information was found for this word.");
  }

  return data[0];
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function createElement(tag, className, text = "") {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function displayWord(entry) {
  results.replaceChildren();

  const card = createElement("article", "word-card");
  const heading = createElement("div", "word-heading");
  const wordInfo = document.createElement("div");

  const title = createElement("h2", "", entry.word || "Unknown word");
  const phonetics = entry.phonetics || [];
  const phoneticText =
    entry.phonetic || phonetics.find(item => item.text)?.text;

  const pronunciation = createElement(
    "p",
    "pronunciation",
    phoneticText
      ? `Pronunciation: ${phoneticText}`
      : "Pronunciation information is unavailable."
  );

  wordInfo.append(title, pronunciation);
  heading.appendChild(wordInfo);

  const audioUrl = phonetics.find(item => item.audio?.trim())?.audio;

  if (audioUrl) {
    const audioButton = createElement("button", "audio-button", "▶ Listen");
    audioButton.type = "button";
    audioButton.setAttribute("aria-label", `Play pronunciation of ${entry.word}`);

    audioButton.addEventListener("click", async () => {
      const audio = new Audio(audioUrl);

      try {
        await audio.play();
        showStatus("Playing pronunciation.");
      } catch {
        showStatus("Audio could not be played. Please try again.", true);
      }
    });

    heading.appendChild(audioButton);
  }

  card.appendChild(heading);

  const meanings = entry.meanings || [];

  if (meanings.length === 0) {
    card.appendChild(
      createElement("p", "muted", "No definitions are available for this word.")
    );
  }

  meanings.forEach(meaning => {
    const section = createElement("section", "meaning-section");
    const partOfSpeech = createElement(
      "span",
      "part-of-speech",
      meaning.partOfSpeech || "Meaning"
    );

    section.appendChild(partOfSpeech);

    const definitions = meaning.definitions || [];

    if (definitions.length === 0) {
      section.appendChild(
        createElement("p", "muted", "No definitions are available for this meaning.")
      );
    }

    definitions.forEach((item, index) => {
      const definitionItem = document.createElement("div");
      definitionItem.className = "definition-item";

      const definition = createElement(
        "p",
        "",
        `${index + 1}. ${item.definition || "Definition unavailable."}`
      );

      definitionItem.appendChild(definition);

      if (item.example) {
        definitionItem.appendChild(
          createElement("p", "example", `Example: “${item.example}”`)
        );
      }

      section.appendChild(definitionItem);
    });

    const synonyms = new Set([
      ...(meaning.synonyms || []),
      ...definitions.flatMap(item => item.synonyms || [])
    ]);

    const synonymParagraph = document.createElement("p");
    synonymParagraph.className = "synonyms";

    const synonymLabel = document.createElement("strong");
    synonymLabel.textContent = "Synonyms: ";

    synonymParagraph.appendChild(synonymLabel);
    synonymParagraph.appendChild(
      document.createTextNode(
        synonyms.size ? [...synonyms].join(", ") : "No synonyms available."
      )
    );

    section.appendChild(synonymParagraph);
    card.appendChild(section);
  });

  if (entry.sourceUrls?.length) {
    const sourceUrl = entry.sourceUrls.find(url => {
      try {
        return new URL(url).protocol === "https:";
      } catch {
        return false;
      }
    });

    if (sourceUrl) {
      const sourceLink = document.createElement("a");
      sourceLink.className = "source-link";
      sourceLink.href = sourceUrl;
      sourceLink.target = "_blank";
      sourceLink.rel = "noopener noreferrer";
      sourceLink.textContent = "View source ↗";
      card.appendChild(sourceLink);
    }
  }

  results.appendChild(card);
}

searchForm.addEventListener("submit", async event => {
  event.preventDefault();

  const word = wordInput.value.trim();

  if (!word) {
    showStatus("Please enter a word to search.", true);
    wordInput.focus();
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "Searching...";
  showStatus(`Searching for "${word}"...`);

  try {
    const entry = await fetchWord(word);
    displayWord(entry);
    showStatus(`Results for "${entry.word}".`);
  } catch (error) {
    results.replaceChildren();

    const errorCard = createElement("div", "error-card");
    errorCard.setAttribute("role", "alert");
    errorCard.appendChild(createElement("h2", "", "Unable to find results"));
    errorCard.appendChild(
      createElement("p", "", error.message || "Something went wrong. Please try again.")
    );

    results.appendChild(errorCard);
    showStatus(error.message || "An unexpected error occurred.", true);
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "Search ↗";
  }
});
