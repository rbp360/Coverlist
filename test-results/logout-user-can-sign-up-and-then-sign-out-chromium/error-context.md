# Page snapshot

```yaml
- generic [ref=e1]:
    - banner [ref=e2]:
        - generic [ref=e3]:
            - link "SongDeck" [ref=e4] [cursor=pointer]:
                - /url: /
            - navigation [ref=e5]:
                - button "← Back" [ref=e6] [cursor=pointer]
                - link "Projects" [ref=e7] [cursor=pointer]:
                    - /url: /projects
                - link "My Repertoire" [ref=e8] [cursor=pointer]:
                    - /url: /repertoire
                - link "Add Songs" [ref=e9] [cursor=pointer]:
                    - /url: /songs
                - button "Open user menu" [active] [ref=e11] [cursor=pointer]:
                    - generic [ref=e12]: 👤
                    - generic [ref=e13]: Profile
    - main [ref=e14]:
        - generic [ref=e15]:
            - heading "Projects" [level=2] [ref=e16]
            - generic [ref=e17]:
                - textbox "New project name" [ref=e18]
                - button "Create" [ref=e19] [cursor=pointer]
            - list [ref=e20]:
                - listitem [ref=e21]: No projects yet.
    - contentinfo [ref=e22]:
        - generic [ref=e23]: © 2025 SongDeck
```
