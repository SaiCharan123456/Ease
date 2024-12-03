'use client';
import React, { useState, useCallback, useEffect } from "react"; // Import useEffect
import { useHandleStreamResponse } from "../utilities/runtime-helpers";



function MainComponent() {
  const [view, setView] = useState("check-in");
  const [messages, setMessages] = useState([]); 
  const [streamingMessage, setStreamingMessage] = useState("");
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [symptoms, setSymptoms] = useState([]);
  const [thoughts, setThoughts] = useState("");
  const [emotions, setEmotions] = useState("");
  const [behaviors, setBehaviors] = useState("");
  const [alternativeThoughts, setAlternativeThoughts] = useState("");
  const [mentalTools, setMentalTools] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [resources, setResources] = useState([]);
  const commonSymptoms = [
    "Anxiety",
    "Depression",
    "Sleep Issues",
    "Stress",
    "Mood Swings",
    "Difficulty Concentrating",
    "Fatigue",
    "Irritability",
  ];
  const handleSymptomToggle = (symptom) => {
    setSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleFinish = useCallback((message) => {
    setMessages((prev) => [...prev, { role: "assistant", content: message }]);
    setStreamingMessage("");
    
  }, []);





  const handleStreamResponse = useHandleStreamResponse({
    onChunk: setStreamingMessage,
    onFinish: handleFinish,
  });

  const handleAIChat = useCallback(async () => {
    if (!userInput) return; // Prevent sending empty messages

    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: userInput }]); // Add user message immediately

    try {
      const response = await fetch("/integrations/chat-gpt/conversationgpt4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
             role: "system",
             content:
                "You are a mental health AI assistant focused on helping with hypochondria and providing CBT tools. Only answer questions related to these topics.  Respond in a well-structured format using numbered lists for key points and bullet points for supporting details. If a question is outside your area of expertise, politely inform the user to consult a qualified mental health professional.",
            },
            ...messages,
            { role: "user", content: userInput },
         ],
         stream: true,
        }),
      });

      if (!response.ok) {
        // Handle non-2xx responses
        const errorData = await response.json(); // Or response.text() if not JSON
        console.error("API Error:", errorData);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "An error occurred. Please try again later." },
        ]);
        setLoading(false);
        return;
      }

      handleStreamResponse(response);

    } catch (error) {
      console.error("Fetch Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "An error occurred. Please try again later." },
      ]);

    } finally {
      setUserInput(""); // Clear input field *after* sending
      setLoading(false);
    }

  }, [userInput, messages, handleStreamResponse]);

 
  

  const handleSubmitCheckIn = useCallback(async () => {
    setLoading(true);

    try {
      const apiKey = process.env.OPENAI_API_KEY; // Access env variable
      if (!apiKey) {
          console.error("Missing API key!");
          return; // Or handle the error appropriately
      }
      const apiUrl = `/integrations/chat-gpt/conversationgpt4?apiKey=${apiKey}`; // Construct URL

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
               "You are a mental health AI assistant focused on helping with hypochondria and providing CBT tools. Analyze the check-in data and provide a structured response.  Format the response with clear headings (Mental State Analysis, Recommended Tools, Suggested Exercises, Progress Tracking Focus, Relevant Resources) and use numbered lists and bullet points where appropriate to organize information effectively. Restrict your responses to hypochondria and CBT-related information only. If any aspect falls outside this scope, advise the user to consult a professional.",
            },
            {
              role: "user",
              content: `Check-in Data:
                Symptoms: ${symptoms.join(", ")}
                Thoughts: ${thoughts}
                Emotions: ${emotions}
                Behaviors: ${behaviors}
                Alternative Thoughts: ${alternativeThoughts}`,
            },
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        setStreamingMessage("An error occurred. Please try again later.");
        setLoading(false);
        return;
      }

      handleStreamResponse(response);  // Keep this for streaming response
      //setView("check-in-results"); // New view for displaying check-in results

      // Get specific recommendations for each section
      const toolsResponse = await fetch(
        "/integrations/chat-gpt/conversationgpt4",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content:
                  "Based on the user's check-in data, provide specific recommendations for mental tools, exercises, and resources. Format as JSON.",
              },
              {
                role: "user",
                content: `Check-in Data:
                Symptoms: ${symptoms.join(", ")}
                Thoughts: ${thoughts}
                Emotions: ${emotions}
                Behaviors: ${behaviors}
                Alternative Thoughts: ${alternativeThoughts}`,
              },
            ],
            json_schema: {
              name: "recommendations",
              schema: {
                type: "object",
                properties: {
                  mentalTools: {
                    type: "array",
                    items: { type: "string" },
                  },
                  exercises: {
                    type: "array",
                    items: { type: "string" },
                  },
                  resources: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["mentalTools", "exercises", "resources"],
                additionalProperties: false,
              },
            },
          }),
        }
      );
      const recommendationsData = await toolsResponse.json();
      const recommendations = JSON.parse(
        recommendationsData.choices[0].message.content
      );

      setMentalTools(recommendations.mentalTools);
      setExercises(recommendations.exercises);
      setResources(recommendations.resources);

      setStep(4);

    } catch (error) {
        const errorData = await response.json();
          console.error("API Error:", errorData);
          setStreamingMessage("An error occurred. Please try again later.");
          setLoading(false);
          return;
    } finally {
        setLoading(false);
    }

    
  }, [symptoms, thoughts, emotions, behaviors, alternativeThoughts]);

  return (
    <div className="min-h-screen bg-[#f5f6fa] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-crimson-text text-[#2c3e50] mb-8 text-center">
          Mental Health Assistant
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 bg-white rounded-lg shadow-lg p-4">
            <nav className="space-y-2">
              {[
                "Check-in",
                "Mental Tools",
                "Health Tracking",
                "Symptom Tracker",
                "CBT Exercises",
                "CBT Tools",
                "Progress",
                "Resources",
                "Community",
                "AI Support",
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => setView(item.toLowerCase())}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    view === item.toLowerCase()
                      ? "bg-[#3498db] text-white"
                      : "hover:bg-[#edf2f7]"
                  }`}
                >
                  <i
                    className={`fas fa-${
                      item === "Check-in"
                        ? "clipboard-check"
                        : item === "Mental Tools"
                        ? "brain"
                        : item === "Health Tracking"
                        ? "heartbeat"
                        : item === "Symptom Tracker"
                        ? "notes-medical"
                        : item === "CBT Exercises"
                        ? "dumbbell"
                        : item === "CBT Tools"
                        ? "tools"
                        : item === "Progress"
                        ? "chart-line"
                        : item === "Resources"
                        ? "book"
                        : item === "Community"
                        ? "users"
                        : "robot"
                    } mr-2`}
                  ></i>
                  {item}
                </button>
              ))}
            </nav>
          </div>

          <div className="md:col-span-3 bg-white rounded-lg shadow-lg p-6">
            {view === "mental tools" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-crimson-text mb-4">
                  Mental Tools
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">
                      Mindfulness Exercises
                    </h3>
                    <p>
                      Practice being present and aware with guided mindfulness
                      sessions.
                    </p>
                  </div>
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">
                      Stress Management
                    </h3>
                    <p>
                      Learn effective techniques to manage and reduce stress
                      levels.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {view === "health tracking" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-crimson-text mb-4">
                  Health Tracking
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Sleep Log</h3>
                    <p>Track your sleep patterns and quality over time.</p>
                  </div>
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Mood Journal</h3>
                    <p>Record and monitor your daily mood fluctuations.</p>
                  </div>
                </div>
              </div>
            )}

            {view === "symptom tracker" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-crimson-text mb-4">
                  Symptom Tracker
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">
                      Physical Symptoms
                    </h3>
                    <p>Monitor physical health symptoms and their patterns.</p>
                  </div>
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">
                      Emotional Symptoms
                    </h3>
                    <p>Track emotional states and their triggers.</p>
                  </div>
                </div>
              </div>
            )}

            {view === "cbt exercises" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-crimson-text mb-4">
                  CBT Exercises
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">
                      Thought Challenging
                    </h3>
                    <p>
                      Practice exercises to identify and challenge negative
                      thought patterns.
                    </p>
                  </div>
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">
                      Behavioral Experiments
                    </h3>
                    <p>
                      Test your beliefs and assumptions with structured
                      exercises.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {view === "check-in" && (
              <div className="bg-white rounded-lg">
                {step === 1 && (
                  <div>
                    <h2 className="text-xl font-crimson-text mb-4">
                      Your Mental Health Check-in
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {commonSymptoms.map((symptom) => (
                        <button
                          key={symptom}
                          onClick={() => handleSymptomToggle(symptom)}
                          className={`p-3 rounded-lg transition-colors ${
                            symptoms.includes(symptom)
                              ? "bg-[#3498db] text-white"
                              : "bg-[#edf2f7] text-[#2c3e50]"
                          }`}
                        >
                          {symptom}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      className="mt-6 bg-[#3498db] text-white px-6 py-2 rounded-lg hover:bg-[#2980b9] w-full md:w-auto"
                    >
                      Next <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h2 className="text-xl font-crimson-text mb-4">
                      Your Thoughts and Emotions
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <textarea
                          value={thoughts}
                          onChange={(e) => setThoughts(e.target.value)}
                          className="w-full p-3 border rounded-lg h-24"
                          placeholder="What are you thinking about?"
                        />
                      </div>
                      <div>
                        <textarea
                          value={emotions}
                          onChange={(e) => setEmotions(e.target.value)}
                          className="w-full p-3 border rounded-lg h-24"
                          placeholder="How are you feeling?"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setStep(1)}
                          className="bg-[#95a5a6] text-white px-6 py-2 rounded-lg hover:bg-[#7f8c8d]"
                        >
                          <i className="fas fa-arrow-left mr-2"></i> Back
                        </button>
                        <button
                          onClick={() => setStep(3)}
                          className="bg-[#3498db] text-white px-6 py-2 rounded-lg hover:bg-[#2980b9]"
                        >
                          Next <i className="fas fa-arrow-right ml-2"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h2 className="text-xl font-crimson-text mb-4">
                      Your Behaviors and Alternative Thoughts
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <textarea
                          value={behaviors}
                          onChange={(e) => setBehaviors(e.target.value)}
                          className="w-full p-3 border rounded-lg h-24"
                          placeholder="What behaviors resulted from these thoughts and feelings?"
                        />
                      </div>
                      <div>
                        <textarea
                          value={alternativeThoughts}
                          onChange={(e) =>
                            setAlternativeThoughts(e.target.value)
                          }
                          className="w-full p-3 border rounded-lg h-24"
                          placeholder="What could be alternative, more balanced thoughts?"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setStep(2)}
                          className="bg-[#95a5a6] text-white px-6 py-2 rounded-lg hover:bg-[#7f8c8d]"
                        >
                          <i className="fas fa-arrow-left mr-2"></i> Back
                        </button>
                        <button
                          onClick={handleSubmitCheckIn}
                          disabled={loading}
                          className="bg-[#3498db] text-white px-6 py-2 rounded-lg hover:bg-[#2980b9]"
                        >
                          {loading ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            <>
                              Get Analysis{" "}
                              <i className="fas fa-paper-plane ml-2"></i>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-crimson-text mb-4">
                      Your Mental Health Analysis
                    </h2>
                    <div className="bg-[#edf2f7] p-4 rounded-lg">
                      {streamingMessage}
                    </div>
                    <div>
                      <h3> Go Check AI Support</h3>
                    </div>
                    <button
                      onClick={() => {
                        setStep(1);
                        setSymptoms([]);
                        setThoughts("");
                        setEmotions("");
                        setBehaviors("");
                        setAlternativeThoughts("");
                        setStreamingMessage("");
                        //setView("check-in");
                      }}
                      className="bg-[#3498db] text-white px-6 py-2 rounded-lg hover:bg-[#2980b9]"
                    >
                      Start New Check-in <i className="fas fa-redo ml-2"></i>
                    </button>
                  </div>
                )}
              </div>
            )}

            {view === "cbt tools" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-crimson-text mb-4">CBT Tools</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">
                      Thought Record
                    </h3>
                    <p>
                      Document and analyze your thoughts using our structured
                      thought record template.
                    </p>
                  </div>
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">
                      Behavioral Activation
                    </h3>
                    <p>
                      Plan and track activities that can help improve your mood
                      and energy levels.
                    </p>
                  </div>
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">
                      Cognitive Restructuring
                    </h3>
                    <p>
                      Learn to identify and challenge unhelpful thought
                      patterns.
                    </p>
                  </div>
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">
                      Relaxation Techniques
                    </h3>
                    <p>
                      Access guided relaxation exercises and mindfulness
                      practices.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {view === "progress" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-crimson-text mb-4">
                  Your Progress
                </h2>
                <div className="bg-[#edf2f7] p-4 rounded-lg">
                  <p className="text-center text-lg">
                    Track your mental health journey with charts and insights.
                  </p>
                </div>
              </div>
            )}

            {view === "resources" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-crimson-text mb-4">
                  Helpful Resources
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">
                      Educational Materials
                    </h3>
                    <p>
                      Learn about mental health, CBT, and coping strategies.
                    </p>
                  </div>
                  <div className="bg-[#edf2f7] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">
                      Crisis Support
                    </h3>
                    <p>Access emergency contacts and crisis helplines.</p>
                  </div>
                </div>
              </div>
            )}

            {view === "community" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-crimson-text mb-4">
                  Community Support
                </h2>
                <div className="bg-[#edf2f7] p-4 rounded-lg text-center">
                  <p className="text-lg">
                    Connect with others on similar mental health journeys.
                  </p>
                </div>
              </div>
            )}

            {view === "ai support" && (
              <div className="h-[600px] flex flex-col">
                <h2 className="text-2xl font-crimson-text mb-4">
                  AI Support Chat
                </h2>
                <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg p-3 bg-[#edf2f7]">
                      Welcome! I'm here to help you with mental health questions
                      and provide support. How can I assist you today?
                    </div>
                  </div>
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === "user"
                            ? "bg-[#3498db] text-white"
                            : "bg-[#edf2f7]"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {streamingMessage && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-lg p-3 bg-[#edf2f7]">
                        {streamingMessage}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ask me anything about mental health..."
                    className="flex-1 p-3 border rounded-lg"
                    onKeyPress={(e) => e.key === "Enter" && handleAIChat()}
                  />
                  <button
                    onClick={handleAIChat}
                    disabled={loading}
                    className="bg-[#3498db] text-white px-6 py-2 rounded-lg hover:bg-[#2980b9]"
                  >
                    {loading ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-paper-plane"></i>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainComponent;


