# TODO

1. Configure VPN client landing page
   - Provide a small HTTPS page for VPN users.
   - Generate and publish downloadable `.ovpn` client profiles.
   - Decide how client profiles are authenticated and protected.

2. VPN client connect/disconnect notifications
   - Add OpenVPN client-connect and client-disconnect hooks.
   - Send notifications to the administrator.
   - Include username, source IP, VPN IP, timestamp, and event type.

3. General SMTP configuration on hosts
   - Configure host mail delivery for root/system mail.
   - Support receiving or forwarding root mail.
   - Reuse the mail setup for VPN notifications and Certbot/system alerts.
