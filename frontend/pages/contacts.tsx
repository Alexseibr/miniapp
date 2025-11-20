import SEO from '../components/SEO';

const ContactsPage = () => {
  return (
    <>
      <SEO
        title="Контакты Куфор-Код"
        description="Свяжитесь с командой Куфор-Код по вопросам сотрудничества и поддержки."
        canonicalPath="/contacts"
      />
      <h1>Контакты</h1>
      <p>Мы доступны по электронной почте support@kufor-code.test и в Telegram @kufor_code.</p>
    </>
  );
};

export default ContactsPage;
