import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

export function AskAI() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();
      return data.response;
    },
    onSuccess: (data) => {
      setResponse(data);
    },
    onError: () => {
      setResponse("Sorry, I couldn't process your question. Please try again.");
    },
  });

  const handleSubmit = () => {
    if (!question.trim() || askMutation.isPending) return;
    askMutation.mutate(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-primary" />
          Ask Traffic Doctor AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Ask about your traffic, ads, or tickets... (e.g., 'Why did my search clicks drop?' or 'What should I prioritize first?')"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] resize-none bg-background"
            data-testid="input-ai-question"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!question.trim() || askMutation.isPending}
              size="sm"
              className="gap-2"
              data-testid="button-ask-ai"
            >
              {askMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Ask
                </>
              )}
            </Button>
          </div>
        </div>

        {response && (
          <div className="bg-background border rounded-lg p-4 max-h-[400px] overflow-y-auto">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap" data-testid="text-ai-response">
              {response}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
