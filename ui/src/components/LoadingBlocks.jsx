import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(() => {
  return {
    scene: {
      perspective: '800px',
      transformStyle: 'preserve-3d',
      height: '96px',
      width: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    plane: {
      height: '8px',
      width: '8px',
      transformStyle: 'preserve-3d',
      transform: 'rotateX(-40deg) rotateY(-45deg) rotateX(90deg)',
    },
    cube: {
      height: '24px',
      width: '24px',
      transformStyle: 'preserve-3d',
      position: 'absolute',
      fontSize: '1rem',
      '&:nth-of-type(1)': {
        backgroundColor: '#eb4057',
        animation: '$jump1 1.6s 0s infinite',
        transform: 'translate3d(20px, 20px, 0)',
      },
      '&:nth-of-type(3)': {
        backgroundColor: '#fafafa',
        animation: '$jump2 1.6s 0.1s infinite',
        transform: 'translate3d(-20px, 20px, 0)',
      },
      '&:nth-of-type(5)': {
        backgroundColor: 'rgb(255, 231, 152)',
        animation: '$jump4 1.6s 0.2s infinite',
        transform: 'translate3d(-20px, -20px, 0)',
      },
      '&:nth-of-type(7)': {
        backgroundColor: '#66D0C6',
        animation: '$jump3 1.6s 0.3s infinite',
        transform: 'translate3d(20px, -20px, 0)',
      },
    },
    face: {
      height: '24px',
      width: '24px',
      position: 'absolute',
      top: '50%',
      left: '50%',
      backgroundColor: 'inherit',
      '&:nth-of-type(1)': {
        transform: 'rotateX(-90deg) translate3d(0px, -24px, 12px)',
        filter: 'brightness(0.9)',
      },
      '&:nth-of-type(2)': {
        transform:
          'rotateX(-90deg) rotateY(-90deg) translate3d(0px, -24px, -12px)',
        filter: 'brightness(1.1)',
      },
      '&:nth-of-type(3)': {
        transform: 'rotateY(180deg) translate3d(0px, 0px, -36px)',
      },
      '&:nth-of-type(4)': {
        transform:
          'rotateX(-90deg) rotateY(-90deg) translate3d(0px, -24px, 12px)',
      },
      '&:nth-of-type(5)': {
        transform: 'rotateX(-90deg) translate3d(0px, -24px, -12px)',
      },
    },
    '@keyframes jump1': {
      '0%, 40%, 60%': { transform: 'translate3d(20px, 20px, 0)' },
      '16%': { transform: 'translate3d(20px, 20px, 18px)' },
    },
    '@keyframes jump2': {
      '0%, 40%, 100%': { transform: 'translate3d(-20px, 20px, 0)' },
      '16%': { transform: 'translate3d(-20px, 20px, 18px)' },
    },
    '@keyframes jump3': {
      '0%, 40%, 100%': { transform: 'translate3d(20px, -20px, 0)' },
      '16%': { transform: 'translate3d(20px, -20px, 18px)' },
    },
    '@keyframes jump4': {
      '0%, 40%, 100%': { transform: 'translate3d(-20px, -20px, 0)' },
      '16%': { transform: 'translate3d(-20px, -20px, 18px)' },
    },
    shadow: {
      height: '24px',
      width: '24px',
      transformStyle: 'preserve-3d',
      position: 'absolute',
      fontSize: '1rem',
      background: 'radial-gradient(hsl(0, 0%, 0%), transparent)',
      opacity: 0,
      '&:nth-of-type(2)': {
        transform: 'translate3d(20px, 20px, -1px)',
        animation: '$shadow 1.6s 0s infinite',
      },
      '&:nth-of-type(4)': {
        transform: 'translate3d(-20px, 20px, -1px)',
        animation: '$shadow 1.6s 0.1s infinite',
      },
      '&:nth-of-type(6)': {
        transform: 'translate3d(-20px, -20px, -1px)',
        animation: '$shadow 1.6s 0.2s infinite',
      },
      '&:nth-of-type(8)': {
        transform: 'translate3d(20px, -20px, -1px)',
        animation: '$shadow 1.6s 0.3s infinite',
      },
    },
    '@keyframes shadow': {
      '0%, 40%': { opacity: 0 },
      '1%, 31%': { opacity: 0.8 },
      '16%': { opacity: 0.1 },
    },
  };
});

const Cube = () => {
  const classes = useStyles();

  return (
    <>
      <div className={classes.cube}>
        <div className={classes.face} />
        <div className={classes.face} />
        <div className={classes.face} />
        <div className={classes.face} />
        <div className={classes.face} />
      </div>
      <div className={classes.shadow}></div>
    </>
  );
};

const LoadingBlocks = () => {
  const classes = useStyles();
  return (
    <div className={classes.scene}>
      <div className={classes.plane}>
        <Cube />
        <Cube />
        <Cube />
        <Cube />
      </div>
    </div>
  );
};

export default LoadingBlocks;
