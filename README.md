# GPT Perfect Output Generator

## Description

This TypeScript project provides a robust and flexible way to generate structured outputs using OpenAI's GPT models. It's designed to handle dynamic and list-based outputs, ensuring that the responses from the AI align with specific formatting requirements. This tool is for applications requiring precise and structured AI-generated content.

## Features

- **Structured Output Generation**: Easily specify the format of AI-generated content.
- **List and Dynamic Content Handling**: Special handling for list-based and dynamic content in outputs.
- **Customizable Configuration**: Set parameters like AI model, temperature, and maximum attempts.
- **Detailed Logging**: Option for detailed logging of the AI interactions.

## Installation

To use this project, first clone the repository and install the dependencies.

```bash
git clone [repository-url]
cd [project-name]
npm install
```

## Usage

Here's a basic example of how to use the GPT Structured Output Generator:

```typescript
import { strict_output } from './gpt';

// Define your system prompt, user input, and expected response format
const systemPrompt = 'Your system prompt here';
const userInputPrompt = 'Your user input here';
const expectedResponseFormat = {
  /* your expected JSON format */
};

// Optionally define configuration settings
const config = {
  aiModel: 'gpt-3.5-turbo',
  temperature: 0.7,
  // ... other configurations
};

// Generate structured output
strict_output(systemPrompt, userInputPrompt, expectedResponseFormat, config)
  .then((output) => console.log(output))
  .catch((error) => console.error(error));
```

## Configuration Options

- `defaultResponse`: Default response for unmatched formats.
- `returnValuesOnly`: If set to true, returns only the values from the output.
- `aiModel`: Specifies the AI model to use.
- `temperature`: Controls the randomness of the AI response.
- `maxAttempts`: Maximum attempts to get the desired output.
- `enableDetailedLogging`: Enables detailed logging of the process.

## License

This project is licensed under the [MIT License](LICENSE).
