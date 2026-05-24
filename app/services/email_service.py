"""Email service using smtplib"""
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Handles outbound email via SMTP"""

    @staticmethod
    def _send(to: str, subject: str, html_body: str) -> bool:
        """Send an HTML email. Returns True on success."""
        if not settings.smtp_user or not settings.smtp_password:
            logger.warning("SMTP credentials not configured — email not sent to %s", to)
            return False

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.email_from_name} <{settings.smtp_user}>"
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.ehlo()
                server.starttls(context=context)
                server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(settings.smtp_user, to, msg.as_string())
            logger.info("Email sent to %s — %s", to, subject)
            return True
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", to, exc)
            return False

    @staticmethod
    def send_password_reset(to: str, username: str, reset_token: str) -> bool:
        reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0"
                     style="background:#fff;border-radius:12px;overflow:hidden;
                            box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr><td style="background:linear-gradient(135deg,#c62828,#e53935);
                               padding:32px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">
                    &#128197; DonorLink
                  </h1>
                  <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">
                    Recuperación de contraseña
                  </p>
                </td></tr>
                <!-- Body -->
                <tr><td style="padding:40px 36px;">
                  <p style="color:#333;font-size:16px;margin:0 0 16px;">
                    Hola, <strong>{username}</strong>
                  </p>
                  <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 28px;">
                    Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                    Haz clic en el botón de abajo para crear una nueva contraseña.
                    Este enlace expirará en <strong>1 hora</strong>.
                  </p>
                  <div style="text-align:center;margin:0 0 28px;">
                    <a href="{reset_url}"
                       style="display:inline-block;background:linear-gradient(135deg,#c62828,#e53935);
                              color:#fff;text-decoration:none;padding:14px 36px;
                              border-radius:8px;font-size:15px;font-weight:700;
                              letter-spacing:0.3px;">
                      Restablecer contraseña
                    </a>
                  </div>
                  <p style="color:#888;font-size:13px;line-height:1.5;margin:0;">
                    Si no solicitaste este cambio, ignora este email — tu contraseña
                    seguirá siendo la misma.<br><br>
                    O copia este enlace en tu navegador:<br>
                    <a href="{reset_url}" style="color:#c62828;word-break:break-all;">
                      {reset_url}
                    </a>
                  </p>
                </td></tr>
                <!-- Footer -->
                <tr><td style="background:#fafafa;padding:20px 36px;text-align:center;
                               border-top:1px solid #eee;">
                  <p style="color:#aaa;font-size:12px;margin:0;">
                    DonorLink &mdash; Sistema de Gestión de Donantes de Sangre<br>
                    Cada donación puede salvar hasta 3 vidas.
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """
        return EmailService._send(to, "Restablecer contraseña — DonorLink", html)

    @staticmethod
    def send_donor_approved(to: str, donor_name: str, username: str, temp_password: Optional[str] = None) -> bool:
        login_url = f"{settings.frontend_url}/login"
        credentials_block = ""
        if temp_password:
            credentials_block = f"""
            <div style="background:#fff3e0;border:1px solid #ffe0b2;border-radius:8px;
                        padding:16px 20px;margin:20px 0;">
              <p style="margin:0 0 8px;font-weight:700;color:#e65100;">Tus credenciales temporales:</p>
              <p style="margin:0;color:#333;">Usuario: <strong>{username}</strong></p>
              <p style="margin:4px 0 0;color:#333;">Contraseña temporal: <strong>{temp_password}</strong></p>
              <p style="margin:8px 0 0;font-size:13px;color:#888;">
                Por seguridad, cambia tu contraseña al ingresar por primera vez.
              </p>
            </div>
            """
        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0"
                     style="background:#fff;border-radius:12px;overflow:hidden;
                            box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                <tr><td style="background:linear-gradient(135deg,#c62828,#e53935);
                               padding:32px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">
                    &#10084; DonorLink
                  </h1>
                  <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">
                    ¡Tu cuenta fue aprobada!
                  </p>
                </td></tr>
                <tr><td style="padding:40px 36px;">
                  <p style="color:#333;font-size:16px;margin:0 0 16px;">
                    ¡Hola, <strong>{donor_name}</strong>!
                  </p>
                  <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px;">
                    Nos complace informarte que tu solicitud como donante de sangre ha sido
                    <strong style="color:#2e7d32;">aprobada</strong>.
                    Ya puedes iniciar sesión y comenzar a ayudar a salvar vidas.
                  </p>
                  {credentials_block}
                  <div style="text-align:center;margin:28px 0;">
                    <a href="{login_url}"
                       style="display:inline-block;background:linear-gradient(135deg,#c62828,#e53935);
                              color:#fff;text-decoration:none;padding:14px 36px;
                              border-radius:8px;font-size:15px;font-weight:700;">
                      Ir al portal
                    </a>
                  </div>
                  <p style="color:#888;font-size:13px;">
                    Gracias por unirte a nuestra comunidad de donantes.
                    Tu generosidad marca la diferencia.
                  </p>
                </td></tr>
                <tr><td style="background:#fafafa;padding:20px 36px;text-align:center;
                               border-top:1px solid #eee;">
                  <p style="color:#aaa;font-size:12px;margin:0;">
                    DonorLink &mdash; Cada donación puede salvar hasta 3 vidas.
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """
        return EmailService._send(to, "¡Tu cuenta de donante fue aprobada! — DonorLink", html)
