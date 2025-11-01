import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { Container } from "react-bootstrap";

const MarkdownPage: React.FC = () => {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    // Fetch the markdown file from public folder
    fetch("./README.md")
      .then((res) => res.text())
      .then(setContent);
  }, []);

  useEffect(() => {
    if (content) {
      mermaid.initialize({ startOnLoad: true, theme: "default" });
      mermaid.contentLoaded();
    }
  }, [content]);

  return (
    <Container fluid className="flex-grow-1 overflow-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || "");

            if (match?.[1] === "mermaid") {
              return (
                <div className="mermaid">
                  {String(children).replace(/\n$/, "")}
                </div>
              );
            }

            return (
              <pre className={className}>
                <code>{children}</code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Container>
  );
};

export default MarkdownPage;
