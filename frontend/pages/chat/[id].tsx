import { GetServerSideProps } from 'next';
import SEO from '../../components/SEO';

interface ChatPageProps {
  chatId: string;
}

const ChatPage = ({ chatId }: ChatPageProps) => {
  return (
    <>
      <SEO title={`Чат ${chatId} — Куфор-Код`} description="Общение с продавцом" canonicalPath={`/chat/${chatId}`} />
      <h1>Чат #{chatId}</h1>
      <p>Интерфейс чата и сообщения загружаются.</p>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<ChatPageProps> = async ({ params }) => {
  const chatId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  if (!chatId) {
    return { notFound: true };
  }

  return {
    props: { chatId },
  };
};

export default ChatPage;
