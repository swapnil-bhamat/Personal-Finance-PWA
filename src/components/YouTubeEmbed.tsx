import { Card, Ratio } from "react-bootstrap";

type YouTubeEmbedProps = {
  /** Full YouTube embed URL or nocookie URL */
  src: string;
  title?: string;
};

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  src,
  title = "Reference Video",
}) => {
  return (
    <Card>
      <Card.Header as="h6">{title}</Card.Header>
      <Card.Body>
        <Ratio aspectRatio="16x9">
          <iframe
            src={src}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ border: 0 }}
          />
        </Ratio>
      </Card.Body>
    </Card>
  );
};
export default YouTubeEmbed;
