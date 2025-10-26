# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - banner [ref=e2]:
        - generic [ref=e3]:
            - link "SongDeck" [ref=e4]:
                - /url: /
            - navigation [ref=e5]:
                - button "← Back" [ref=e6] [cursor=pointer]
                - link "Projects" [ref=e7]:
                    - /url: /projects
                - link "My Repertoire" [ref=e8]:
                    - /url: /repertoire
                - link "Add Songs" [ref=e9]:
                    - /url: /songs
                - link "Profile" [ref=e10]:
                    - /url: /profile
                    - generic [ref=e12]: Profile
                - link "Log in" [ref=e13]:
                    - /url: /login
    - main [ref=e14]:
        - generic [ref=e15]:
            - heading "Sign up" [level=2] [ref=e16]
            - generic [ref=e17]:
                - textbox "Email" [ref=e18]
                - textbox "Password" [ref=e19]: password123
                - paragraph [ref=e20]: Signup failed
                - button "Create account" [ref=e21] [cursor=pointer]
            - paragraph [ref=e22]:
                - text: Have an account?
                - link "Log in" [ref=e23]:
                    - /url: /login
    - contentinfo [ref=e24]:
        - generic [ref=e25]: © 2025 SongDeck
    - alert [ref=e26]
```
