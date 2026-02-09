#!/usr/bin/env python3
import os

APPS_DIR = os.path.join(os.path.dirname(__file__), 'apps')
CONTACT_HTML = os.path.join(os.path.dirname(__file__), 'contact.html')

# Ustal kolejność aplikacji (jeśli chcesz, by habitswipe była zawsze pierwsza)
def get_apps():
    apps = []
    for name in sorted(os.listdir(APPS_DIR)):
        if name.startswith('.') or name.startswith('_'):
            continue
        if os.path.isdir(os.path.join(APPS_DIR, name)):
            apps.append(name)
    # habitswipe zawsze pierwsza, jeśli istnieje
    if 'habitswipe' in apps:
        apps.remove('habitswipe')
        apps = ['habitswipe'] + apps
    return apps

def generate_app_mail_html(app_name):
    pretty = app_name.capitalize()
    return f'''              <a class="item" href="mailto:{app_name}@zameflow.com?subject={pretty}%20Support">
                <span class="item-title">{pretty}</span>
                <span class="item-sub">{app_name}@zameflow.com</span>
              </a>'''

def update_contact_html(apps):
    with open(CONTACT_HTML, 'r', encoding='utf-8') as f:
        html = f.read()
    # Znajdź sekcję listy maili aplikacji
    start = html.find('<div class="list" style="margin-top: 14px;">')
    if start == -1:
        raise Exception('Nie znaleziono sekcji listy aplikacji!')
    end = html.find('</div>', start)
    if end == -1:
        raise Exception('Nie znaleziono końca sekcji listy aplikacji!')
    before = html[:start]
    after = html[end:]
    mails_html = '\n' + '\n'.join(generate_app_mail_html(app) for app in apps) + '\n'  # wcięcie zachowane
    new_html = before + '<div class="list" style="margin-top: 14px;">' + mails_html + after
    with open(CONTACT_HTML, 'w', encoding='utf-8') as f:
        f.write(new_html)

if __name__ == '__main__':
    apps = get_apps()
    update_contact_html(apps)
    print(f'Zaktualizowano maile aplikacji: {apps}')
