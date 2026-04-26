import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_activation_email(
    *,
    recipient_email: str,
    recipient_name: str,
    organisation_name: str,
    temporary_password: str,
    login_url: str,
    plan_label: str,
) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_FROM_EMAIL:
        logger.warning("SMTP is not configured; activation email not sent to %s", recipient_email)
        return False

    subject = "Your ADC account is ready"
    text_body = (
        f"Hello {recipient_name},\n\n"
        f"Your organisation '{organisation_name}' has been provisioned on ADC ({plan_label}).\n"
        f"You can sign in immediately at: {login_url}\n\n"
        f"Username: {recipient_email}\n"
        f"Temporary password: {temporary_password}\n\n"
        "Please sign in now and change your password.\n\n"
        "Regards,\n"
        "ADC Support"
    )

    html_body = (
        f"<p>Hello {recipient_name},</p>"
        f"<p>Your organisation <strong>{organisation_name}</strong> has been provisioned on ADC ({plan_label}). "
        f"You can sign in immediately at <a href='{login_url}'>{login_url}</a>.</p>"
        f"<p><strong>Username:</strong> {recipient_email}<br>"
        f"<strong>Temporary password:</strong> {temporary_password}</p>"
        "<p>Please sign in now and change your password.</p>"
        "<p>Regards,<br>ADC Support</p>"
    )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = recipient_email
    if settings.SMTP_BCC:
        message["Bcc"] = settings.SMTP_BCC
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    try:
        if settings.SMTP_USE_SSL:
            smtp = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
        else:
            smtp = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)

        with smtp as server:
            if settings.SMTP_USE_TLS and not settings.SMTP_USE_SSL:
                server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)

        return True
    except Exception:
        logger.exception("Failed to send activation email to %s", recipient_email)
        return False
