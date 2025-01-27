export const mockOpenAIResponse = {
    summary: {
        content: "This is a mocked summary of the video. It contains the main points and key takeaways that would normally be generated by the OpenAI API.",
        tokens: 100
    },
    error: {
        message: "Mocked OpenAI API error"
    }
};

// Mock the OpenAI client
export const mockOpenAIClient = {
    chat: {
        completions: {
            create: jest.fn().mockResolvedValue({
                choices: [{
                    message: {
                        content: mockOpenAIResponse.summary.content
                    }
                }]
            })
        }
    }
}; 