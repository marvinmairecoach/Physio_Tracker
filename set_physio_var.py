import subprocess, json

# Get MYSQL_URL from the MySQL service
result = subprocess.run(["railway", "run", "-s", "MySQL", "--", "sh", "-c", "echo $MYSQL_URL"], 
                       capture_output=True, text=True, env={**__import__('os').environ, "PATH": f"{__import__('os').path.expanduser('~/.railway/bin')}:{__import__('os').environ.get('PATH', '')}"})
url = result.stdout.strip()
print(f"MySQL URL: {url}")

# Set PHYSIO_DATABASE_URL on Physio_Tracker using this URL
result2 = subprocess.run(["railway", "variable", "set", f"PHYSIO_DATABASE_URL={url}", "--service", "Physio_Tracker", "--json"],
                        capture_output=True, text=True, env={**__import__('os').environ, "PATH": f"{__import__('os').path.expanduser('~/.railway/bin')}:{__import__('os').environ.get('PATH', '')}"})
print(f"Set result: {result2.stdout}")