from info_monitor_scheduler.scheduler import Scheduler


def main() -> None:
    scheduler = Scheduler()
    scheduler.run_once()


if __name__ == "__main__":
    main()
