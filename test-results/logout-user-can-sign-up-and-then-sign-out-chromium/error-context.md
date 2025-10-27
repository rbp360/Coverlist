# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
    - main [ref=e10]:
        - generic [ref=e11]:
            - heading "Projects" [level=2] [ref=e12]
            - generic [ref=e13]:
                - textbox "New project name" [ref=e14]
                - button "Create" [ref=e15] [cursor=pointer]
            - list [ref=e16]:
                - listitem [ref=e17]: No projects yet.
    - contentinfo [ref=e18]:
        - generic [ref=e19]: © 2025 SongDeck
    - alert [ref=e20]
```
