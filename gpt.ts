import OpenAI from 'openai';

/**
 * An instance of the OpenAI API.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * The format of the output.
 */
interface OutputFormat {
  [key: string]: string | string[] | OutputFormat;
}

/**
 * Configuration options for strict output behavior.
 *
 * @param defaultResponse The default response to use if the output is not in the expected format.
 * @param returnValuesOnly Whether to return only the values of the output.
 * @param aiModel The AI model to use.
 * @param temperature The temperature to use for the AI model.
 * @param maxAttempts The maximum number of attempts to try to get the output in the expected format.
 * @param enableDetailedLogging Whether to enable detailed logging.
 */
interface StrictOutputConfig {
  defaultResponse?: string;
  returnValuesOnly?: boolean;
  aiModel?: string;
  temperature?: number;
  maxAttempts?: number;
  enableDetailedLogging?: boolean;
}

/**
 * Executes a strict output generation using the OpenAI API.
 *
 * @param systemPrompt The system prompt to provide context for the AI model.
 * @param userInputPrompt The user input prompt(s) to generate the output.
 * @param expectedResponseFormat The expected format of the response.
 * @param config Optional configuration parameters for the strict output generation.
 * @returns The generated output(s) based on the provided prompts and configuration.
 */
export async function gptPerfect(
  systemPrompt: string,
  userInputPrompt: string | string[],
  expectedResponseFormat: OutputFormat,
  config: StrictOutputConfig = {}
) {
  const {
    defaultResponse = '',
    returnValuesOnly = false,
    aiModel = 'gpt-3.5-turbo',
    temperature = 0.2,
    maxAttempts = 3,
    enableDetailedLogging = false,
  } = config;

  // Check if the user input prompt is a list of prompts
  const isListInput: boolean = Array.isArray(userInputPrompt);
  const jsonifiedFormat = JSON.stringify(expectedResponseFormat);
  // Check if the expected response format is dynamic (i.e. contains <...>)
  const expectedDynamic: boolean = expectedDynamicOutput(jsonifiedFormat);
  // Check if the expected response format is a list (i.e. contains [...])
  const expectedList: boolean = expectedListOutput(jsonifiedFormat);

  let errorMessage: string = '';

  // Try to get the output in the expected format
  for (let i = 0; i < maxAttempts; i++) {
    const prompt = buildPrompt(
      systemPrompt,
      expectedResponseFormat,
      expectedList,
      expectedDynamic,
      isListInput,
      errorMessage
    );

    const response = await getAIResponse(
      openai,
      prompt,
      temperature,
      aiModel,
      userInputPrompt
    );
    let result = parseAIResponse(response);

    // Log details if enabled
    if (enableDetailedLogging) {
      logDetails(systemPrompt, prompt, userInputPrompt, result);
    }

    // Validate and format the output
    try {
      let output = validateAndFormatOutput(
        result,
        isListInput,
        expectedResponseFormat,
        defaultResponse,
        returnValuesOnly
      );
      return isListInput ? output : output[0];
    } catch (e) {
      errorMessage = formatErrorMessage(result, e);
      console.error(`An exception occurred with error: ${e}. Invalid JSON format in the result: ${result}`);
    }
  }

  return [];
}

/**
 * Checks if the expected response format contains dynamic values.
 *
 * @param expectedResponseFormat - The expected response format to be checked.
 * @returns True if the expected response format contains dynamic values, false otherwise.
 */
function expectedDynamicOutput(jsonifiedFormat: string) {
  return /<.*?>/.test(jsonifiedFormat);
}

/**
 * Checks if the expected response format is a list.
 *
 * @param expectedResponseFormat - The expected response format to be checked.
 * @returns True if the expected response format is a list, false otherwise.
 */
function expectedListOutput(jsonifiedFormat: string) {
  return /\[.*?\]/.test(jsonifiedFormat);
}

/**
 * Builds a prompt message based on the provided parameters.
 *
 * @param systemPrompt - The system prompt message.
 * @param expectedResponseFormat - The expected response format.
 * @param expectedList - Indicates if the output should be an array of objects.
 * @param expectedDynamic - Indicates if dynamic content needs to be generated.
 * @param isListInput - Indicates if the input is a list.
 * @param errorMessage - The error message to be appended to the prompt.
 * @returns The generated prompt message.
 */
function buildPrompt(
  systemPrompt: string,
  expectedResponseFormat: any,
  expectedList: boolean,
  expectedDynamic: boolean,
  isListInput: boolean,
  errorMessage: string
) {
  // Start with the system prompt and append instructions
  let prompt = `${systemPrompt}\n\nOutput Format Instructions:\n`;

  // Specify the JSON format
  prompt += `Output the following in JSON format: ${JSON.stringify(expectedResponseFormat)}.\n`;
  prompt += `Avoid quotation marks or escape characters (\\) in the output fields.\n`;

  // Add specific instructions based on the expected response characteristics
  if (expectedList) {
    prompt += `If an output field is a list, output it as an array of objects.\n`;
  }
  if (expectedDynamic) {
    prompt += `Replace content enclosed by < and > with appropriate generated content. For example, '<location>' should be replaced with a specific location like 'the garden'.\n`;
  }
  if (isListInput) {
    prompt += `For each input element, generate a separate JSON object in an array.\n`;
  }

  // Append any error messages from previous attempts, if present
  if (errorMessage) {
    prompt += `\nError Message:\n${errorMessage}\n`;
  }

  return prompt;
}

/**
 * Retrieves AI response using OpenAI chat completions.
 * @param openai - The OpenAI instance.
 * @param prompt - The system prompt.
 * @param temperature - The temperature value for generating diverse responses.
 * @param aiModel - The AI model to use for generating responses.
 * @param userInputPrompt - The user input prompt.
 * @returns A promise that resolves to the AI response.
 */
async function getAIResponse(
  openai: OpenAI,
  prompt: any,
  temperature: any,
  aiModel: any,
  userInputPrompt: { toString: () => any }
) {
  return await openai.chat.completions.create({
    model: aiModel,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: userInputPrompt.toString() },
    ],
    temperature,
  });
}

/**
 * Parses the response from the AI chat completion and returns the processed result.
 *
 * @param response - The response object from the AI chat completion.
 * @returns The processed result after replacing single quotes with double quotes and fixing word contractions.
 */
function parseAIResponse(response: OpenAI.Chat.Completions.ChatCompletion) {
  let result = response.choices[0].message?.content?.replace(/'/g, '"') ?? '';
  return result.replace(/(\w)"(\w)/g, "$1'$2");
}

/**
 * Logs the details of the GPT response.
 *
 * @param systemPrompt - The system prompt used for generating the GPT response.
 * @param prompt - The prompt used for generating the GPT response.
 * @param userInputPrompt - The user input prompt(s) used for generating the GPT response.
 * @param result - The GPT response.
 */
function logDetails(
  systemPrompt: string,
  prompt: string,
  userInputPrompt: string | string[],
  result: string
) {
  console.log('--- System Prompt ---\n', systemPrompt);
  console.log('--- Additional Prompt ---\n', prompt);
  console.log('--- User Prompt ---\n', userInputPrompt);
  console.log('--- GPT Response ---\n', result);
  
}

/**
 * Validates and formats the output of a function.
 *
 * @param result - The result to validate and format.
 * @param isListInput - Indicates whether the input is a list.
 * @param expectedResponseFormat - The expected format of the response.
 * @param defaultResponse - The default response to use if validation fails.
 * @param returnValuesOnly - Indicates whether to return only the values.
 * @returns The validated and formatted output.
 * @throws Error if the output format is not as expected.
 */
function validateAndFormatOutput(
  result: string,
  isListInput: boolean,
  expectedResponseFormat: OutputFormat,
  defaultResponse: string,
  returnValuesOnly: boolean
) {
  // Parse the result into a JSON object
  let output = JSON.parse(result);

  // If the input is a list, the output must be an array of json
  if (isListInput && !Array.isArray(output)) {
    throw new Error('Output format not in an array of json');
  }

  // If the input is not a list, wrap the output in an array
  output = isListInput ? output : [output];
  output.forEach((item: any, index: any) => {
    // Validate the output item
    validateOutputItem(
      item,
      expectedResponseFormat,
      defaultResponse,
      returnValuesOnly
    );
  });

  // Return the output
  return output;
}

/**
 * Formats an error message with the given result and error.
 *
 * @param result - The result string.
 * @param error - The error object.
 * @returns The formatted error message.
 */
function formatErrorMessage(result: string, error: any) {
  return `Result:\n${result}\n\nError Message:\n${error}`;
}

/**
 * Validates the output item against the expected response format.
 * If the item does not match the expected format, an error is thrown.
 * If returnValuesOnly is true, the item is converted to an array of its values.
 *
 * @param item - The output item to validate.
 * @param expectedResponseFormat - The expected format of the response.
 * @param defaultResponse - The default response to use if a key is missing in the item.
 * @param returnValuesOnly - Indicates whether to return only the values of the item.
 * @throws {Error} If a key in the expected response format is missing in the item.
 */
function validateOutputItem(
  item: { [s: string]: unknown } | ArrayLike<unknown>,
  expectedResponseFormat: any,
  defaultResponse: any,
  returnValuesOnly: any
) {
  // Iterate through the expected response format to check if any of the
  // fields are present in the output.
  for (const key in expectedResponseFormat) {
    // Skip fields that are not present in the output.
    if (/<.*?>/.test(key)) continue;

    // Throw an error if the field is not present in the output.
    if (!(key in item)) {
      throw new Error(`${key} not in json output`);
    }

    // Process the output field to check if it is valid.
    processOutputField(item, key, expectedResponseFormat, defaultResponse);
  }

  // If returnValuesOnly is true, convert the output item to an array
  if (returnValuesOnly) {
    item = Object.values(item);
  }
}

/**
 * Processes the output field of an item based on the expected response format.
 * If the field is an array, it selects the first element and checks if it matches the expected choices.
 * If it doesn't match and a default response is provided, it sets the field to the default response.
 * If the field contains a colon, it splits the field by the colon and keeps only the first part.
 *
 * @param item - The item containing the output field.
 * @param key - The key of the output field.
 * @param expectedResponseFormat - The expected response format for the output field.
 * @param defaultResponse - The default response to use if the output field doesn't match the expected choices.
 */
function processOutputField(
  item: { [s: string]: unknown } | ArrayLike<unknown>,
  key: string,
  expectedResponseFormat: { [x: string]: any },
  defaultResponse: any
) {
  // Check if the expected response format is an array
  if (Array.isArray(expectedResponseFormat[key])) {
    // Set the choices to the expected response format
    const choices = expectedResponseFormat[key];
    // Check if the item's key is an array
    if (Array.isArray(item[key])) {
      // Set the item's key to the first item in the array
      item[key] = item[key][0];
    }
    // Check if the choices do not include the item's key
    if (!choices.includes(item[key]) && defaultResponse) {
      // Set the item's key to the default response
      item[key] = defaultResponse;
    }
    // Check if the item's key includes a ':'
    if (item[key].includes(':')) {
      // Remove the ':' from the key
      item[key] = item[key].split(':')[0];
    }
  }
}
