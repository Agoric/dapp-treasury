import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  getStarted: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
    height: theme.spacing(45),
    margin: 'auto',
  },
  graphicContainer: {
    height: theme.spacing(45),
    width: theme.spacing(45),
  },
  graphic: {
    opacity: 0.6,
    objectFit: 'none',
    width: '200%',
    height: '200%',
    transform: 'scale(0.5) translateX(-50%) translateY(-50%)',
  },
  getStartedAction: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(5),
    '& > *': {
      marginBottom: theme.spacing(2),
    },
  },
}));

const GetStarted = ({ onGetStarted }) => {
  const classes = useStyles();

  return (
    <div className={classes.getStarted}>
      <div className={classes.graphicContainer}>
        <img className={classes.graphic} src="/assets/boats.png" />
      </div>
      <div className={classes.getStartedAction}>
        <div>No BLD locked</div>
        <Button
          onClick={() => onGetStarted()}
          className={classes.button}
          variant="contained"
          color="primary"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default GetStarted;
